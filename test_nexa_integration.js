/**
 * test_nexa_integration.js
 * -------------------------
 * Verifies NEXA assistant routing, knowledge matching, action generation,
 * and application-context responsiveness.
 */

const http = require('http');

async function testNexaDirect() {
  console.log("=== STARTING NEXA ASSISTANT VERIFICATION ===");

  // Dynamically require our built library
  const { findKnowledgeMatch, NEXSPACE_KNOWLEDGE } = require('./lib/nexa/knowledge.ts');
  const { ALLOWED_ACTIONS, isValidAction } = require('./lib/nexa/intents.ts');
  const { queryNexaWithGemini } = require('./lib/nexa/gemini.ts');

  console.log(`[1] Knowledge Base Loaded: ${NEXSPACE_KNOWLEDGE.length} verified topics.`);

  const testCases = [
    {
      name: "General Overview",
      input: "What is NexSpace?",
      context: { currentPage: "/" },
      expectedIntent: "GENERAL_INFO",
      expectAction: true,
    },
    {
      name: "Upload Assistance",
      input: "How do I upload a satellite image?",
      context: { currentPage: "/dashboard" },
      expectedIntent: "UPLOAD",
      expectAction: true,
      expectedRoute: "/upload",
    },
    {
      name: "Object Grounding (Without Image)",
      input: "I want to locate buildings",
      context: { currentPage: "/query", hasSourceImage: false },
      expectedIntent: "OBJECT_DETECTION",
      expectAction: true,
      expectedRoute: "/upload",
    },
    {
      name: "Object Grounding (With Active Image)",
      input: "Find buildings in my image",
      context: { currentPage: "/query", hasSourceImage: true, sourceImageFilename: "port.png" },
      expectedIntent: "OBJECT_DETECTION",
      expectAction: true,
      expectedRoute: "/query",
    },
    {
      name: "Bi-Temporal Change Detection",
      input: "How do I compare two satellite images?",
      context: { currentPage: "/dashboard" },
      expectedIntent: "CHANGE_DETECTION",
      expectAction: true,
      expectedRoute: "/comparison",
    },
    {
      name: "Evidence Viewer",
      input: "Show me the evidence and spatial coordinates",
      context: { currentPage: "/results" },
      expectedIntent: "EVIDENCE",
      expectAction: true,
      expectedRoute: "/evidence",
    },
    {
      name: "Execution Trace",
      input: "How did NexSpace reach this result?",
      context: { currentPage: "/results" },
      expectedIntent: "EXECUTION_TRACE",
      expectAction: true,
      expectedRoute: "/execution",
    },
    {
      name: "Report Generation with Active Investigation",
      input: "Generate an investigation report",
      context: { currentPage: "/evidence", hasInvestigation: true, investigationId: "INV-9821" },
      expectedIntent: "REPORT",
      expectAction: true,
      expectedRoute: "/reports",
    },
    {
      name: "Out of scope query",
      input: "What is the capital of France?",
      context: { currentPage: "/" },
      expectedIntent: "GENERAL_INFO",
    },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const res = await queryNexaWithGemini(tc.input, [], tc.context);
    console.log(`\n--- Test: ${tc.name} ---`);
    console.log(`Input: "${tc.input}"`);
    console.log(`Intent: ${res.intent}`);
    console.log(`Message: ${res.message.substring(0, 100)}...`);
    console.log(`Action: ${res.action ? JSON.stringify(res.action) : "None"}`);

    if (tc.expectedIntent && res.intent !== tc.expectedIntent) {
      console.error(`❌ Expected intent ${tc.expectedIntent}, got ${res.intent}`);
    } else if (tc.expectAction && !res.action) {
      console.error(`❌ Expected action, got null`);
    } else if (tc.expectedRoute && res.action?.route !== tc.expectedRoute) {
      console.error(`❌ Expected route ${tc.expectedRoute}, got ${res.action?.route}`);
    } else {
      console.log(`✅ Passed`);
      passed++;
    }
  }

  console.log(`\n==============================================`);
  console.log(`NEXA ASSISTANT VERIFICATION: ${passed}/${testCases.length} PASSED`);
  console.log(`==============================================\n`);
}

testNexaDirect().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
