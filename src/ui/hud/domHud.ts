import { NPC_DEFINITIONS_BY_ID } from "../../game/content/npcs";
import { TownSimulation } from "../../game/simulation/systems/TownSimulation";

const formatStatusMode = (connected: boolean, usingFallback: boolean): string => {
  if (connected) {
    return "在线";
  }
  if (usingFallback) {
    return "本地";
  }
  return "等待连接";
};

const supportsTouchControls = (): boolean =>
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

const createTouchButton = (label: string, action: string): HTMLButtonElement => {
  const button = document.createElement("button");
  button.className = "touch-button";
  button.type = "button";
  button.textContent = label;
  button.dataset.touchControl = action;
  return button;
};

export const createHud = (
  mountPoint: HTMLElement,
  simulation: TownSimulation,
): void => {
  const touchEnabled = supportsTouchControls();
  const hudLayer = document.createElement("div");
  hudLayer.className = "hud-layer";
  if (touchEnabled) {
    hudLayer.classList.add("touch-enabled");
  }

  const statusPanel = document.createElement("section");
  statusPanel.className = "status-panel";

  const statusBadge = document.createElement("span");
  statusBadge.className = "status-badge";

  const statusTitle = document.createElement("h1");
  statusTitle.className = "status-title";
  statusTitle.textContent = "赛博小镇";

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

  const interactionPrompt = document.createElement("div");
  interactionPrompt.className = "interaction-prompt is-hidden";

  const touchControls = document.createElement("section");
  touchControls.className = "touch-controls";
  touchControls.setAttribute("aria-label", "触屏控制区");

  const touchPad = document.createElement("div");
  touchPad.className = "touch-pad";
  touchPad.append(
    createTouchButton("▲", "move-up"),
    createTouchButton("◀", "move-left"),
    createTouchButton("▶", "move-right"),
    createTouchButton("▼", "move-down"),
  );

  const touchActions = document.createElement("div");
  touchActions.className = "touch-actions";
  const interactButton = createTouchButton("交互", "interact");
  interactButton.classList.add("action");
  const closeTouchButton = createTouchButton("关闭", "close");
  closeTouchButton.classList.add("action", "secondary");
  touchActions.append(interactButton, closeTouchButton);

  touchControls.append(touchPad, touchActions);

  hudLayer.append(statusPanel, dialoguePanel, interactionPrompt, touchControls);
  mountPoint.append(hudLayer);

  let draftValue = "";
  let previousSignature = "";
  let wasDialogueOpen = false;
  let previousActiveNpcId: string | null = null;
  let renderedNpcId: string | null = null;

  const updateCompactMode = (): void => {
    const rect = mountPoint.getBoundingClientRect();
    const compact = rect.width <= 600 || rect.height <= 460;
    const ultraCompact = rect.width <= 430 || rect.height <= 390;

    hudLayer.classList.toggle("compact-mobile", compact);
    hudLayer.classList.toggle("ultra-compact-mobile", ultraCompact);
  };

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
      ? touchEnabled
        ? `可交互：${nearbyNpc.name}（点交互）`
        : `可交互：${nearbyNpc.name}（按 E）`
      : touchEnabled
        ? "靠近 NPC 后点交互"
        : "靠近 NPC 后按 E";

    interactionPrompt.textContent = nearbyNpc
      ? touchEnabled
        ? `点交互 与 ${nearbyNpc.name} 对话`
        : `按 E 与 ${nearbyNpc.name} 对话`
      : "";
    interactionPrompt.classList.toggle(
      "is-hidden",
      !nearbyNpc || state.dialogue.open,
    );

    statusMeta.textContent = "";
    statusError.textContent = state.backend.lastError
      ? `后端异常：${state.backend.lastError}`
      : "";
    statusPanel.classList.toggle("has-error", Boolean(state.backend.lastError));

    dialoguePanel.classList.toggle("is-hidden", !state.dialogue.open);
    dialogueName.textContent = activeNpc ? activeNpc.name : "未选中 NPC";
    dialogueTitle.textContent = activeNpc
      ? activeNpc.title
      : `与 NPC 交互：${touchEnabled ? '点交互':'按E'}`;

    composerNote.textContent = state.dialogue.sending
      ? "等待回复…"
      : activeNpc
        ? `与 ${activeNpc.name} 对话中`
        : "发送消息";

    sendButton.disabled = state.dialogue.sending || draftValue.trim() === "";
    input.disabled = !state.dialogue.open;
    closeButton.disabled = !state.dialogue.open;

    if (input.value !== draftValue) {
      input.value = draftValue;
    }

    renderMessages();
    hudLayer.classList.toggle("dialogue-open", state.dialogue.open);

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

  updateCompactMode();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      updateCompactMode();
    });
    observer.observe(mountPoint);
  }
  window.addEventListener("resize", updateCompactMode);

  simulation.subscribe(render);
  render();
};
