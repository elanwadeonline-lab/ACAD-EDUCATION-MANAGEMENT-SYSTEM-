import { expect, test } from "bun:test";
import { resultPublicationState } from "../frontend/lib/resultPresentation";
test("scheduled results are not labelled as published",()=>{ expect(resultPublicationState({result_status:"scheduled",is_result_released:false})).toBe("scheduled"); });
test("backend release state takes precedence after scheduled release",()=>{ expect(resultPublicationState({result_status:"scheduled",is_result_released:true})).toBe("released"); });
test("hidden and explicitly unreleased results stay unpublished",()=>{ expect(resultPublicationState({result_status:"hidden"})).toBe("hidden"); expect(resultPublicationState({result_status:"released",is_result_released:false})).toBe("hidden"); });
test("legacy results retain the existing published presentation",()=>{ expect(resultPublicationState({})).toBe("released"); });
