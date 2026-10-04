export type ExamGroup = "experimental" | "mathematics";
export type Section = "riasec" | "personality" | "values" | "abilities" | "workstyle";
export type Question = { id: string; text: string; groups: string[]; section: string; primaryDimension: string; effects: { dimension: string; weight: number; direction: string }[] };
export type Occupation = { code: string; title: string; rawInterests: Record<string, number>; dateUpdated: string; domainSource: string };
export type Family = { id: string; title: string; description: string; group: string; interestProfile: Record<string, number>; selfReportProfile: Record<string, number>; selfReportProfileStatus: string; occupationCodes: string[] };
export type Major = { id: string; title: string; familyId: string; kind: string; groups: string[]; admissionStatus: string; interestProfile: Record<string, number>; selfReportProfile: Record<string, number>; selfReportProfileStatus: string; occupations: Occupation[]; mapping: { rationale: string; status: string } };
export type Catalog = {
  questions: { catalogVersion: string; items: Question[] };
  families: { items: Family[] };
  majors: { items: Major[]; profileSource: { dataset: string; version: string; sha256: string; url: string; license: string; attribution: string } };
  scoring: { engineVersion: string; method: string; dimensions: { id: string; label: string; section: string }[]; sectionWeights: Record<string, number>; dimensionWeights: Record<string, number>; scoreMeaning: string; sensitivity: { answerStep: number; dimensionWeightRelativeChange: number } };
  report_templates: { audiences: { student: { disclaimer: string }; counselor: { disclaimer: string } } };
};
export type DimensionScore = { score: number; itemCount: number; totalWeight: number; label: string; section: string };
export type Contribution = { dimension: string; label: string; userScore: number; targetScore: number; contribution: number; relationship: "shared_higher" | "shared_lower" | "different" | "neutral" };
export type Ranking = { id: string; title: string; rank: number | null; score: number | null; correlation: number | null; contributions: Contribution[]; familyId?: string; kind?: string; mappingRationale?: string; occupations?: Occupation[]; description?: string };
export type SensitivityRange = { id: string; minRank: number; maxRank: number; selectedCount: number };
export type ResultSnapshot = {
  schemaVersion: 2; engineVersion: string; catalogVersion: string; examGroup: ExamGroup;
  status: "exploratory" | "insufficient_interest_differentiation";
  profile: Record<string, DimensionScore>;
  familyRanking: Ranking[]; majorRanking: Ranking[]; topFamilies: Ranking[]; topMajors: Ranking[];
  explanations: { title: string; interpretation: string; notices: string[] };
  method: { id: string; sectionWeights: Record<string, number>; dimensionWeights: Record<string, number>; scoreMeaning: string };
  evidence: { status: "unvalidated_pilot"; source: Catalog["majors"]["profileSource"]; questionnaire: string; crosswalk: string; admission: string };
  quality: { uniformResponses: boolean; interestRange: number; tiedFamilyBoundary: boolean; tiedMajorBoundary: boolean };
  sensitivity: { scenarioCount: number; answerScenarioCount: number; weightScenarioCount: number; unrankableScenarios: number; familyRanges: SensitivityRange[]; majorRanges: SensitivityRange[]; interpretation: string };
  integrity?: { catalogSha256: string; answersSha256: string };
};
