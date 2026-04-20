import { NPC_DEFINITIONS_BY_ID } from "../../game/content/npcs";
import { TownSimulation } from "../../game/simulation/systems/TownSimulation";

const formatStatusMode = (connected: boolean, usingFallback: boolean): string => {
  if (connected) {
    return "后端在线";
  }
  if (usingFallback) {
    return "本地兜底";
  }
  return "等待连接";
};

export const createHud = (
  mountPoint: HTMLElement,
  simulation: TownSimulation,
): void => {
  const hudLayer = document.createElement("div");
  hudLayer.className = "hud-layer";

  const statusPanel = document.createElement("section");
  statusPanel.className = "status-panel";

  const statusBadge = document.createElement("span");
  statusBadge.className = "status-badge";

  const statusTitle = document.createElement("h1");
  statusTitle.className = "status-title";
  statusTitle.textContent = "赛博小镇 Phaser 版";

  const statusSummary = document.createElement("p");
  statusSummary.className = "status-summary";

  const statusMeta = document.createElement("p");
  statusMeta.className = "status-meta";

  const statusError = document.createElement("p");
  statusError.className = "status-error";

  statusPanel.append(statusBadge, statusTitle, statusSummary, statusMeta, statusError);

  const dialoguePanel = document.createElement("section");
  dialoguePanel.className = "dialogue-panel is-hidden";

  const dialogueName = document.createElement("h2");
  dialogueName.className = "dialogue-name";

  const dialogueTitle = document.createElement("p");
  dialogueTitle.className = "dialogue-title";

  const messageList = document.createElement("div");
  messageList.className = "message-list";

  const composerNote = document.createElement("p");
  composerNote.className = "composer-note";

  const composer = document.createElement("div");
  composer.className = "composer";

  const input = document.createElement("input");
  input.className = "composer-input";
  input.type = "text";
  input.placeholder = "输入消息，按 Enter 发送…";

  const sendButton = document.createElement("button");
  sendButton.className = "composer-button";
  sendButton.type = "button";
  sendButton.textContent = "发送";

  const closeButton = document.createElement("button");
  closeButton.className = "composer-button secondary";
  closeButton.type = "button";
  closeButton.textContent = "关闭";

  composer.append(input, sendButton, closeButton);
  dialoguePanel.append(
    dialogueName,
    dialogueTitle,
    messageList,
    composerNote,
    composer,
  );

  hudLayer.append(statusPanel, dialoguePanel);
  mountPoint.append(hudLayer);

  let draftValue = "";
  let previousSignature = "";
  let wasDialogueOpen = false;
  let previousActiveNpcId: string | null = null;
  let renderedNpcId: string | null = null;

  const scrollMessagesToBottom = (): void => {
    window.requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });
  };

  const maybeSendMessage = (): void => {
    const nextMessage = draftValue.trim();
    if (!nextMessage) {
      return;
    }

    draftValue = "";
    input.value = "";
    render();
    void simulation.sendMessage(nextMessage);
  };

  const renderMessages = (): void => {
    const state = simulation.getState();
    const activeNpcId = state.dialogue.npcId;
    if (!activeNpcId) {
      if (renderedNpcId !== null || previousSignature !== "") {
        messageList.innerHTML = "";
        renderedNpcId = null;
        previousSignature = "";
      }
      return;
    }

    const relevantMessages = state.dialogue.messages.filter(
      (message) => message.npcId === activeNpcId,
    );

    const signature = relevantMessages.map((message) => message.id).join("|");
    if (activeNpcId === renderedNpcId && signature === previousSignature) {
      return;
    }

    messageList.innerHTML = relevantMessages
      .map((message) => {
        const speakerLabel =
          message.speaker === "player"
            ? "玩家"
            : message.speaker === "npc"
              ? NPC_DEFINITIONS_BY_ID[activeNpcId].name
              : "系统";

        return `<div class="message ${message.speaker}">
          <span class="message-speaker">${speakerLabel}</span>
          <span class="message-text">${message.text}</span>
        </div>`;
      })
      .join("");

    renderedNpcId = activeNpcId;
    previousSignature = signature;
    scrollMessagesToBottom();
  };

  const render = (): void => {
    const state = simulation.getState();
    const nearbyNpc = state.player.nearbyNpcId
      ? NPC_DEFINITIONS_BY_ID[state.player.nearbyNpcId]
      : null;
    const activeNpc = state.dialogue.npcId
      ? NPC_DEFINITIONS_BY_ID[state.dialogue.npcId]
      : null;
    const secondsUntilRefresh = Math.max(
      0,
      Math.ceil((state.backend.nextStatusRefreshAt - state.time) / 1000),
    );

    statusBadge.textContent = formatStatusMode(
      state.backend.connected,
      state.backend.usingFallback,
    );
    statusBadge.dataset.mode = state.backend.connected
      ? "backend"
      : state.backend.usingFallback
        ? "fallback"
        : "pending";

    statusSummary.textContent = nearbyNpc
      ? `当前可交互 NPC：${nearbyNpc.name}，按 E 开始对话。`
      : "四向移动探索办公室，靠近 NPC 后按 E 触发对话。";

    statusMeta.textContent = `状态轮询 ${secondsUntilRefresh}s · 接口 ${state.backend.apiBaseUrl}`;
    statusError.textContent = state.backend.lastError
      ? `提示：${state.backend.lastError}`
      : "后端负责聊天、记忆、好感度和 NPC 状态轮询。";

    dialoguePanel.classList.toggle("is-hidden", !state.dialogue.open);
    dialogueName.textContent = activeNpc ? activeNpc.name : "未选中 NPC";
    dialogueTitle.textContent = activeNpc
      ? activeNpc.title
      : "靠近任意 NPC 后按 E 打开对话";

    composerNote.textContent = state.dialogue.sending
      ? "正在等待回复…"
      : activeNpc
        ? `和 ${activeNpc.name} 聊聊他今天在做什么。`
        : "打开对话后即可发送消息。";

    sendButton.disabled = state.dialogue.sending || draftValue.trim() === "";
    input.disabled = !state.dialogue.open;
    closeButton.disabled = !state.dialogue.open;

    if (input.value !== draftValue) {
      input.value = draftValue;
    }

    renderMessages();

    if (
      state.dialogue.open &&
      (!wasDialogueOpen || activeNpc?.id !== previousActiveNpcId)
    ) {
      scrollMessagesToBottom();
    }

    if (state.dialogue.open && !wasDialogueOpen) {
      window.setTimeout(() => {
        input.focus({ preventScroll: true });
      }, 0);
    }
    if (!state.dialogue.open && wasDialogueOpen) {
      input.blur();
    }

    wasDialogueOpen = state.dialogue.open;
    previousActiveNpcId = activeNpc?.id ?? null;
  };

  input.addEventListener("input", () => {
    draftValue = input.value;
    render();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      maybeSendMessage();
    }

    if (event.key === "Escape") {
      simulation.closeDialogue();
    }
  });

  sendButton.addEventListener("click", () => {
    maybeSendMessage();
  });

  closeButton.addEventListener("click", () => {
    simulation.closeDialogue();
  });

  simulation.subscribe(render);
  render();
};
