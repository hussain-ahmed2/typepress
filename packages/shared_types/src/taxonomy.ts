export interface TaxonomyBrief {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export interface TaxonomyDetail extends TaxonomyBrief {
  parent_id: string | null;
  children: TaxonomyBrief[];
}

export interface CreateTaxonomyInput {
  name: string;
  slug: string;
  type: string;
  parent_id?: string;
}
