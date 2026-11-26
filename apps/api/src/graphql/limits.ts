/**
 * GraphQL abuse-control limits.
 *
 * Enforces query depth and complexity ceilings to reduce expensive nested queries.
 * Implemented as lightweight GraphQL validation rules (no extra dependencies).
 */
import {
  GraphQLError,
  Kind,
  type ASTNode,
  type FieldNode,
  type FragmentDefinitionNode,
  type FragmentSpreadNode,
  type InlineFragmentNode,
  type OperationDefinitionNode,
  type ValidationContext,
  type ValidationRule,
} from 'graphql';

/** Maximum allowed selection depth (root operation = depth 1). */
export const MAX_QUERY_DEPTH = 10;

/** Maximum allowed query complexity/cost score. */
export const MAX_QUERY_COMPLEXITY = 300;

/** Default multiplier when a list argument is present but cannot be parsed safely. */
const DEFAULT_LIST_MULTIPLIER = 10;

/** Known list-size argument names used to estimate resolver fan-out. */
const LIST_SIZE_ARGS = new Set(['limit', 'first', 'last', 'pageSize']);

interface ComplexityOptions {
  /** Maximum allowed complexity score. */
  max_complexity: number;
}

interface DepthOptions {
  /** Maximum allowed depth. */
  max_depth: number;
}

function get_named_fragments(context: ValidationContext): Map<string, FragmentDefinitionNode> {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of context.getDocument().definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(definition.name.value, definition);
    }
  }
  return fragments;
}

/** Skip limits for introspection-only operations (GraphiQL/dev tooling). */
function is_introspection_only_operation(node: OperationDefinitionNode): boolean {
  const selections = node.selectionSet.selections;
  if (selections.length === 0) return false;
  return selections.every(
    (selection) => selection.kind === Kind.FIELD && selection.name.value.startsWith('__'),
  );
}

function resolve_int_argument(node: FieldNode, name: string): number | null {
  const arg = node.arguments?.find((candidate) => candidate.name.value === name);
  if (!arg) return null;
  if (arg.value.kind === Kind.INT) {
    const parsed = Number.parseInt(arg.value.value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function estimate_list_multiplier(node: FieldNode): number {
  for (const name of LIST_SIZE_ARGS) {
    const value = resolve_int_argument(node, name);
    if (value !== null) return value;
  }

  // If the field has a list-size arg name but non-literal value, use conservative default.
  const has_dynamic_list_arg = node.arguments?.some(
    (arg) => LIST_SIZE_ARGS.has(arg.name.value) && arg.value.kind !== Kind.INT,
  );
  return has_dynamic_list_arg ? DEFAULT_LIST_MULTIPLIER : 1;
}

function selection_depth(
  node: OperationDefinitionNode | FieldNode | InlineFragmentNode | FragmentDefinitionNode,
  fragments: Map<string, FragmentDefinitionNode>,
  seen_fragments: Set<string>,
): number {
  if (!node.selectionSet) return 0;

  let max_child_depth = 0;
  for (const selection of node.selectionSet.selections) {
    let child_depth = 0;

    if (selection.kind === Kind.FIELD) {
      const nested = selection_depth(selection, fragments, seen_fragments);
      // Named field adds one level; nested depth already includes child fields.
      child_depth = 1 + nested;
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      child_depth = selection_depth(selection, fragments, seen_fragments);
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      child_depth = fragment_spread_depth(selection, fragments, seen_fragments);
    }

    if (child_depth > max_child_depth) max_child_depth = child_depth;
  }

  return max_child_depth;
}

function fragment_spread_depth(
  spread: FragmentSpreadNode,
  fragments: Map<string, FragmentDefinitionNode>,
  seen_fragments: Set<string>,
): number {
  const name = spread.name.value;
  if (seen_fragments.has(name)) return 0; // Prevent cycles; depth handled by first visit.
  const fragment = fragments.get(name);
  if (!fragment) return 0;

  seen_fragments.add(name);
  const depth = selection_depth(fragment, fragments, seen_fragments);
  seen_fragments.delete(name);
  return depth;
}

function selection_complexity(
  node: OperationDefinitionNode | FieldNode | InlineFragmentNode | FragmentDefinitionNode,
  fragments: Map<string, FragmentDefinitionNode>,
  seen_fragments: Set<string>,
): number {
  if (!node.selectionSet) return 0;

  let total = 0;
  for (const selection of node.selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const child_complexity = selection_complexity(selection, fragments, seen_fragments);
      const multiplier = estimate_list_multiplier(selection);
      // Base field cost + multiplied child cost (list fan-out).
      total += 1 + child_complexity * multiplier;
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      total += selection_complexity(selection, fragments, seen_fragments);
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      total += fragment_spread_complexity(selection, fragments, seen_fragments);
    }
  }

  return total;
}

function fragment_spread_complexity(
  spread: FragmentSpreadNode,
  fragments: Map<string, FragmentDefinitionNode>,
  seen_fragments: Set<string>,
): number {
  const name = spread.name.value;
  if (seen_fragments.has(name)) return 0;
  const fragment = fragments.get(name);
  if (!fragment) return 0;

  seen_fragments.add(name);
  const complexity = selection_complexity(fragment, fragments, seen_fragments);
  seen_fragments.delete(name);
  return complexity;
}

/** Validation rule rejecting queries deeper than max_depth. */
export function create_depth_limit_rule(options: DepthOptions): ValidationRule {
  return function depth_limit_rule(context: ValidationContext) {
    const fragments = get_named_fragments(context);
    return {
      OperationDefinition(node: OperationDefinitionNode): void {
        if (is_introspection_only_operation(node)) return;
        const depth = selection_depth(node, fragments, new Set());
        if (depth > options.max_depth) {
          context.reportError(
            new GraphQLError(`Query depth ${depth} exceeds maximum allowed depth ${options.max_depth}.`, {
              nodes: [node as ASTNode],
              extensions: { code: 'QUERY_TOO_DEEP', http: { status: 400 } },
            }),
          );
        }
      },
    };
  };
}

/** Validation rule rejecting queries whose estimated complexity exceeds max_complexity. */
export function create_complexity_limit_rule(options: ComplexityOptions): ValidationRule {
  return function complexity_limit_rule(context: ValidationContext) {
    const fragments = get_named_fragments(context);
    return {
      OperationDefinition(node: OperationDefinitionNode): void {
        if (is_introspection_only_operation(node)) return;
        const complexity = selection_complexity(node, fragments, new Set());
        if (complexity > options.max_complexity) {
          context.reportError(
            new GraphQLError(
              `Query complexity ${complexity} exceeds maximum allowed complexity ${options.max_complexity}.`,
              {
                nodes: [node as ASTNode],
                extensions: { code: 'QUERY_TOO_COMPLEX', http: { status: 400 } },
              },
            ),
          );
        }
      },
    };
  };
}
