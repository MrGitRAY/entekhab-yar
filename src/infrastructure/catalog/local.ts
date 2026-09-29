import questions from "../../../data/questions.json";
import families from "../../../data/families.json";
import majors from "../../../data/majors.json";
import scoring from "../../../data/scoring.json";
import report_templates from "../../../data/report_templates.json";
import type { Catalog } from "@/domain/matching/types";
export const localCatalog: Catalog = { questions, families, majors, scoring, report_templates };
