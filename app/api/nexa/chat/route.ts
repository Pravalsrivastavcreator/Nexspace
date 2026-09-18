import { NextResponse } from "next/server";
import { queryNexaWithGemini, NexaChatMessage, NexaAppContext } from "@/lib/nexa/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = (body.message || "").trim();
    const conversation: NexaChatMessage[] = Array.isArray(body.conversation)
      ? body.conversation
      : [];
    const context: NexaAppContext = body.context || {};

    if (!message) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const responsePayload = await queryNexaWithGemini(
      message,
      conversation,
      context
    );

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("[API nexa/chat] Unexpected error:", error);
    return NextResponse.json(
      {
        message:
          "I encountered an error processing your request. Please try again or ask another NexSpace question.",
        intent: "GENERAL_INFO",
        action: null,
        suggestions: ["How do I upload an image?", "What is NexSpace?"],
        provider: "local_knowledge_engine",
      },
      { status: 500 }
    );
  }
}
