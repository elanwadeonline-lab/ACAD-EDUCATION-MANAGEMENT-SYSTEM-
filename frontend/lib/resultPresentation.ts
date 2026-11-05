import type { ExamResult } from "./types";
export function resultPublicationState(result: Pick<ExamResult,"result_status"|"is_result_released">): "released"|"hidden"|"scheduled" {
 if(result.is_result_released === true) return "released";
 if(result.result_status === "scheduled") return "scheduled";
 if(result.result_status === "hidden" || result.is_result_released === false) return "hidden";
 return "released";
}
