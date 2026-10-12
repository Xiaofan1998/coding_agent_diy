let mockSequence = 0;

export class MockResponsesClient {
  constructor(config) {
    this.config = config;
  }

  async createResponse({ instructions, conversationItems, toolDefinitions }) {
    const responseId = `mock_response_${++mockSequence}`;
    const conversation = conversationItems || [];

    if (hasToolResult(conversation)) {
      return {
        id: responseId,
        outputText: "Mock model finished after receiving tool output.",
        functionCalls: [],
        rawOutput: []
      };
    }

    const lastUserText = findLastUserText(conversation);
    const redirectNotice = conversation.some((item) => {
      return item.role === "user" && String(item.content || "").includes('Strategy notice: first tool');
    });

    const suggestedTools = extractSuggestedFirstTools(conversation, instructions);
    const availableNames = new Set((toolDefinitions || []).map((tool) => tool.name));
    const openApprovals = extractOpenApprovals(instructions);

    if (redirectNotice && suggestedTools.length > 0) {
      const chosen = suggestedTools.find((name) => availableNames.has(name)) || "get_dashboard_summary";
      return {
        id: responseId,
        outputText: "",
        functionCalls: [
          {
            id: `mock_call_${mockSequence}`,
            callId: `mock_call_${mockSequence}`,
            name: chosen,
            arguments: {}
          }
        ],
        rawOutput: []
      };
    }

    if (openApprovals > 0) {
      const approvalFirst = ["list_approval_requests", "read_approval_request", "read_approval_artifact"]
        .find((name) => availableNames.has(name) && suggestedTools.includes(name));
      if (approvalFirst) {
        return {
          id: responseId,
          outputText: "",
          functionCalls: [
            {
              id: `mock_call_${mockSequence}`,
              callId: `mock_call_${mockSequence}`,
              name: approvalFirst,
              arguments: {}
            }
          ],
          rawOutput: []
        };
      }
    }

    if (lastUserText.toLowerCase().includes("plan")) {
      const preferred = availableNames.has("get_dashboard_summary") ? "get_dashboard_summary" : "list_files";
      return {
        id: responseId,
        outputText: "",
        functionCalls: [
          {
            id: `mock_call_${mockSequence}`,
            callId: `mock_call_${mockSequence}`,
            name: preferred,
            arguments: {}
          }
        ],
        rawOutput: []
      };
    }

    const mismatchCandidates = [
      "list_reviews",
      "list_files",
      "list_skills"
    ];
    const intentionallyWrong = mismatchCandidates.find((name) => {
      return availableNames.has(name) && !suggestedTools.includes(name);
    }) || "get_dashboard_summary";

    return {
      id: responseId,
      outputText: "",
      functionCalls: [
        {
          id: `mock_call_${mockSequence}`,
          callId: `mock_call_${mockSequence}`,
          name: intentionallyWrong,
          arguments: {}
        }
      ],
      rawOutput: []
    };
  }
}

function hasToolResult(conversation) {
  return (conversation || []).some((item) => {
    return Array.isArray(item.content) && item.content.some((block) => block?.type === "tool_result");
  });
}

function findLastUserText(conversation) {
  const reversed = [...conversation].reverse();
  const userItem = reversed.find((item) => item.role === "user");
  return String(userItem?.content || "");
}

function extractSuggestedFirstTools(conversation, instructions) {
  const sources = [
    ...conversation.map((item) => String(item.content || "")),
    String(instructions || "")
  ];

  for (const content of sources) {
    const match = content.match(/Suggested first tools:\s*([^\n]+)/i);
    if (match) {
      return match[1]
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry && entry !== "(none)");
    }
  }
  return [];
}

function extractOpenApprovals(instructions) {
  const content = String(instructions || "");
  const match = content.match(/Open approval requests:\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}
