import { Suspense } from "react";
import WardDetailContent from "../[id]/WardDetailContent";
export default function WardProfilePage(){return <Suspense fallback={<p>Loading child profile…</p>}><WardDetailContent/></Suspense>;}
