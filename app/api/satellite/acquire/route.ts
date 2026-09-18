import { NextResponse } from "next/server";
import { satelliteOrchestrator } from "@/server/services/satellite/satelliteAcquisitionService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = (body.query || body.location || "").trim();

    if (!query) {
      return NextResponse.json({ error: "Location or query parameter is required." }, { status: 400 });
    }

    const result = await satelliteOrchestrator.acquireFromNaturalLanguage(query, body.forceRefresh || false);

    if (!result) {
      return NextResponse.json({
        status: "location_not_found",
        message: `Could not identify a geographic location in query "${query}".`
      }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      location: result.location,
      metadata: result.acquisition.metadata,
      sourceImage: result.sourceImage,
      isBiTemporal: result.isBiTemporal,
      telemetryStages: result.telemetryStages
    });
  } catch (error: any) {
    console.error("[API satellite/acquire] Error:", error);
    return NextResponse.json({ error: "Failed to acquire satellite imagery." }, { status: 500 });
  }
}
