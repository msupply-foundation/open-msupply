export type DemographicNodeLite = {
  id: string;
  name: string;
};

export type DemographicBuckets = {
  child011: DemographicNodeLite;
  child12: DemographicNodeLite;
  child25: DemographicNodeLite;
  womenNonPregnant: DemographicNodeLite;
  womenPregnant: DemographicNodeLite;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const ageRangeMatch = (name: string, min: number, max: number) => {
  const normalized = normalize(name);
  const compact = normalized.replace(/\s+/g, '');
  const dashPattern = new RegExp(`${min}\\s*[-–]\\s*${max}`);
  const toPattern = new RegExp(`${min}\\s*(to|until|upto)\\s*${max}`);
  const compactDashPattern = new RegExp(`${min}[-–]${max}`);

  return (
    dashPattern.test(normalized) ||
    toPattern.test(normalized) ||
    compactDashPattern.test(compact)
  );
};

const isWomenLike = (name: string) => {
  const normalized = normalize(name);
  return (
    normalized.includes('women') ||
    normalized.includes('woman') ||
    normalized.includes('female') ||
    normalized.includes('females')
  );
};

const isPregnantLike = (name: string) => {
  const normalized = normalize(name);
  return normalized.includes('pregnant');
};

const isNonPregnantLike = (name: string) => {
  const normalized = normalize(name);
  return (
    normalized.includes('non pregnant') ||
    normalized.includes('non-pregnant') ||
    normalized.includes('not pregnant')
  );
};

const findStrictBucket = (
  nodes: DemographicNodeLite[],
  used: Set<string>,
  finder: (node: DemographicNodeLite) => boolean,
  fallback: DemographicNodeLite
): DemographicNodeLite => {
  const match = nodes.find(node => !used.has(node.id) && finder(node));
  if (match) {
    used.add(match.id);
    return match;
  }

  return fallback;
};

const isChildUnderOneLike = (name: string) => {
  const normalized = normalize(name);
  return (
    ageRangeMatch(name, 0, 11) ||
    normalized.includes('under 1') ||
    normalized.includes('under one')
  );
};

const isChild1To2Like = (name: string) => {
  return ageRangeMatch(name, 12, 23) || ageRangeMatch(name, 1, 2);
};

const isChild2To5Like = (name: string) => {
  return ageRangeMatch(name, 24, 59) || ageRangeMatch(name, 2, 5);
};

export const resolveDemographicBuckets = (
  demographics: DemographicNodeLite[] | undefined
): DemographicBuckets => {
  const all = demographics ?? [];
  const used = new Set<string>();

  const fallbackChild011: DemographicNodeLite = {
    id: 'child-0-11',
    name: 'Children under 1 year',
  };
  const fallbackWomenNonPregnant: DemographicNodeLite = {
    id: 'women-15-49-non-pregnant',
    name: 'Women 15 to 49 years - Non pregnant',
  };
  const fallbackWomenPregnant: DemographicNodeLite = {
    id: 'women-15-49-pregnant',
    name: 'Women 15 to 49 years - Pregnant',
  };
  const fallbackChild12: DemographicNodeLite = {
    id: 'child-12-23',
    name: 'Children 1 to 2 years',
  };
  const fallbackChild25: DemographicNodeLite = {
    id: 'child-24-59',
    name: 'Children 2 to 5 years',
  };

  const child011 = findStrictBucket(
    all,
    used,
    node => node.id === 'child-0-11' || isChildUnderOneLike(node.name),
    fallbackChild011
  );

  const child12 = findStrictBucket(
    all,
    used,
    node =>
      node.id === 'child-12-23' ||
      node.id === 'child-1-2' ||
      isChild1To2Like(node.name),
    fallbackChild12
  );

  const child25 = findStrictBucket(
    all,
    used,
    node =>
      node.id === 'child-24-59' ||
      node.id === 'child-2-5' ||
      isChild2To5Like(node.name),
    fallbackChild25
  );

  const womenNonPregnant = findStrictBucket(
    all,
    used,
    node =>
      node.id === 'women-15-49-non-pregnant' ||
      (ageRangeMatch(node.name, 15, 49) &&
        isWomenLike(node.name) &&
        (isNonPregnantLike(node.name) || !isPregnantLike(node.name))),
    fallbackWomenNonPregnant
  );

  const womenPregnant = findStrictBucket(
    all,
    used,
    node =>
      node.id === 'women-15-49-pregnant' ||
      (ageRangeMatch(node.name, 15, 49) &&
        isWomenLike(node.name) &&
        isPregnantLike(node.name)),
    fallbackWomenPregnant
  );

  return {
    child011,
    child12,
    child25,
    womenNonPregnant,
    womenPregnant,
  };
};

export const isChild011Bucket = (
  groupId: string,
  groupName: string,
  buckets?: DemographicBuckets
) => {
  if (buckets && groupId === buckets.child011.id) return true;
  return groupId === 'child-0-11' || ageRangeMatch(groupName, 0, 11);
};

export const isChild1223Bucket = (
  groupId: string,
  groupName: string,
  buckets?: DemographicBuckets
) => {
  if (buckets && groupId === buckets.child12.id) return true;
  return groupId === 'child-12-23' || ageRangeMatch(groupName, 12, 23);
};

export const isChild25Bucket = (
  groupId: string,
  groupName: string,
  buckets?: DemographicBuckets
) => {
  if (buckets && groupId === buckets.child25.id) return true;
  return (
    groupId === 'child-24-59' ||
    groupId === 'child-2-5' ||
    ageRangeMatch(groupName, 24, 59) ||
    ageRangeMatch(groupName, 2, 5)
  );
};

export const isWomenNonPregnantBucket = (
  groupId: string,
  groupName: string,
  buckets?: DemographicBuckets
) => {
  if (buckets && groupId === buckets.womenNonPregnant.id) return true;
  return (
    groupId === 'women-15-49-non-pregnant' ||
    (ageRangeMatch(groupName, 15, 49) &&
      isWomenLike(groupName) &&
      (isNonPregnantLike(groupName) || !isPregnantLike(groupName)))
  );
};

export const isWomenPregnantBucket = (
  groupId: string,
  groupName: string,
  buckets?: DemographicBuckets
) => {
  if (buckets && groupId === buckets.womenPregnant.id) return true;
  return (
    groupId === 'women-15-49-pregnant' ||
    (ageRangeMatch(groupName, 15, 49) &&
      isWomenLike(groupName) &&
      isPregnantLike(groupName))
  );
};
