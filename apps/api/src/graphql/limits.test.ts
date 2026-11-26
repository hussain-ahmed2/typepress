/**
 * GraphQL abuse-limit tests.
 *
 * Verifies depth and complexity validation rules reject abusive queries
 * while allowing normal operations.
 */
import { describe, expect, it } from 'vitest';
import { buildSchema, parse, specifiedRules, validate } from 'graphql';
import { type_defs } from './schema';
import {
  MAX_QUERY_COMPLEXITY,
  MAX_QUERY_DEPTH,
  create_complexity_limit_rule,
  create_depth_limit_rule,
} from './limits';

// buildSchema keeps validation in the same graphql module instance, avoiding dual-realm issues.
const schema = buildSchema(type_defs);

function validate_query(query: string) {
  return validate(schema, parse(query), [
    ...specifiedRules,
    create_depth_limit_rule({ max_depth: MAX_QUERY_DEPTH }),
    create_complexity_limit_rule({ max_complexity: MAX_QUERY_COMPLEXITY }),
  ]);
}

describe('GraphQL abuse limits', () => {
  it('allows a normal query within limits', () => {
    const errors = validate_query(`
      query Safe {
        contents(limit: 10) {
          items {
            id
            title
            author { id name }
          }
          total
        }
      }
    `);

    expect(errors).toHaveLength(0);
  });

  it('rejects queries exceeding max depth', () => {
    // MenuItem.children is recursive in the schema, so deep nesting is a realistic attack shape.
    const depth_busting = `
      query DepthBust {
        menus {
          items {
            children {
              children {
                children {
                  children {
                    children {
                      children {
                        children {
                          children {
                            children {
                              children {
                                id
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const errors = validate_query(depth_busting);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.extensions?.code).toBe('QUERY_TOO_DEEP');
  });

  it('rejects queries exceeding max complexity', () => {
    // High multiplier via large limit arg on a list field with selected children.
    const complex_query = `
      query Complex {
        contents(limit: 100) {
          items {
            id
            type
            slug
            title
            status
            meta
            created_at
            updated_at
            author {
              id
              email
              name
              role
              created_at
            }
            taxonomies {
              id
              name
              slug
              type
            }
          }
          total
          page
          limit
          total_pages
        }
      }
    `;

    const errors = validate_query(complex_query);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.extensions?.code).toBe('QUERY_TOO_COMPLEX');
  });
});
