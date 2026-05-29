/**
 * 用户「现实身份」与 NPC 对立扮演（第一人称，非旁白）。
 * identityRoleCode 与 ProfessionRole.code 对齐。
 */
const IDENTITY_TO_OPPOSITE = {
  doctor: { npcPromptKey: "patient", speakerLabelZh: "病人" },
  engineer: { npcPromptKey: "seeker", speakerLabelZh: "来访者" },
  programmer: { npcPromptKey: "junior_colleague", speakerLabelZh: "同事" },
  coach: { npcPromptKey: "trainee", speakerLabelZh: "学员" },
  researcher: { npcPromptKey: "student", speakerLabelZh: "学生" },
  psychologist: { npcPromptKey: "client", speakerLabelZh: "来访者" },
  financier: { npcPromptKey: "client_family", speakerLabelZh: "客户" },
  mentor: { npcPromptKey: "mentee", speakerLabelZh: "后辈" },
};

function resolveOppositeForIdentity(identityRoleCode) {
  const code = String(identityRoleCode || "").trim().toLowerCase();
  if (!code) return null;
  return IDENTITY_TO_OPPOSITE[code] || {
    npcPromptKey: "seeker",
    speakerLabelZh: "来访者",
  };
}

module.exports = {
  IDENTITY_TO_OPPOSITE,
  resolveOppositeForIdentity,
};
