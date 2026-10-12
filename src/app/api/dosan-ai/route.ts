import { FieldValue } from "firebase-admin/firestore";
import { DOSAN_AI_NAME, DOSAN_AI_UID, dosanRoomId } from "@/lib/dosan-ai";
import { DOSAN_QUIZ_FACTS } from "@/lib/dosan-quiz-answers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { DOSAN_QUOTES } from "@/lib/quotes";

/**
 * 도산 AI 답장(2026-10-12 사용자 "뉴웨이브앱의 신앙 AI처럼 도산 안창호 선생에 대해 대화할 수 있는 AI를 채팅창에 추가") — 뉴웨이브앱 /api/faith-ai와 같은 방식.
 * 사용자가 자기 방(uid__dosan-ai)에 메시지를 쓴 뒤 브라우저가 이 창구를 부릅니다 → 서버가 최근 대화를 Gemini에 보내 짧은 채팅체 답 1~3개를 받아
 * 방에 AI 이름(senderId dosan-ai)으로 씁니다(규칙상 사용자는 AI 이름으로 못 씀 — 서버만).
 *
 * ★ 속이지 않기: 방 위에 "AI가 답하는 대화" 표시, AI냐고 물으면 AI라고 답하게 지시, 도산 선생 본인이 말하는 것처럼 꾸미지 않게 지시(선생에 "대해" 이야기하는 AI).
 * ★ 지어내지 않기: 앱이 이미 확인해 둔 사실(dosan-quiz-answers.ts의 해설)과 흥사단 "도산의 말씀"(quotes.ts)을 지시문 끝 "참고 자료"로 깔고,
 *   자료에 없는 말씀을 도산이 한 것처럼 인용하지 않게, 모르는 건 모른다고 하게 지시. 그래도 틀릴 수 있어 방 위에 안내를 둠.
 * ★ 개인정보: 대화가 Google Gemini(무료 등급)로 전송됩니다 — 개인정보 처리방침에 적었고 방을 처음 열 때 안내합니다. 무료 등급은 Google이 서비스 개선에 쓸 수 있음.
 * ★ 위기 대응: 자해·자살 신호(CRISIS)가 보이면 AI 답과 별개로 도움 연락처(109)를 서버가 직접 덧붙입니다.
 * ★ 한도: 한 사람 하루 DAILY_PER_USER번, 전체 하루 DAILY_GLOBAL번(무료 한도 보호). 넘으면 AI 이름으로 정중한 안내를 남깁니다. 한 방에 동시에 두 번 답하지 않게 25초 잠금.
 * 열쇠 GEMINI_API_KEY(결제 없는 별도 프로젝트의 무료 키 — 로컬 .env.local, 배포는 Secret Manager). 모델 순서는 GEMINI_MODELS로 바꿀 수 있음.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MODELS = (process.env.GEMINI_MODELS ?? "gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.8-flash").split(",").map((m) => m.trim());
const THINKING: Record<string, string> = { "gemini-3.6-flash": "minimal", "gemini-3.5-flash-lite": "minimal", "gemini-3.5-flash": "minimal" };
const TRY_MS = 12_000;
const HISTORY = 24;
const DAILY_PER_USER = 30;
const DAILY_GLOBAL = 600;
const MAX_USER_TEXT = 1000;

const SCHEMA = {
  type: "object",
  properties: { messages: { type: "array", items: { type: "string" }, description: "1 to 3 short chat messages, sent one after another" } },
  required: ["messages"],
};

/** 자해·자살·학대 신호 — 걸리면 AI 답 뒤에 도움 연락처를 반드시 붙입니다 */
const CRISIS = /(자살|죽고\s?싶|죽을까|죽어버리|목숨을\s?끊|극단적\s?선택|자해|손목을?\s?(긋|그)|살기\s?싫|사라지고\s?싶|죽는\s?게\s?나을|suicid|kill myself|end my life|self[- ]?harm)/i;
const CRISIS_NOTE = "혼자 감당하지 않아도 괜찮아요. 지금 너무 힘들다면 자살예방 상담전화 109(24시간, 무료)에 바로 연락해 보세요. 위급하면 112나 119도 좋아요. 가까운 가족이나 친구, 운영진에게도 꼭 이야기해 주세요.";

/** 참고 자료 — 이 앱이 확인해 둔 사실(퀴즈 해설)과 흥사단 "도산의 말씀"(출처와 함께) */
const FACTS = DOSAN_QUIZ_FACTS.map((fact) => `- ${fact}`).join("\n");
const QUOTES = DOSAN_QUOTES.map((quote) => `- "${quote.text}" (${quote.source})`).join("\n");

const SYSTEM = `너는 "${DOSAN_AI_NAME}"야. '2026 도산 애기애타 리더십 과정' 원우들이 도산 안창호 선생(1878~1938)의 삶과 사상에 대해 편하게 묻고 이야기 나눌 수 있는 AI 대화 상대야. 사람이 아니라 AI이고, 그 사실을 절대 숨기거나 사람인 척하지 않아. 도산 선생 본인이 아니고, 선생인 척 1인칭으로 말하지도 않아("나 안창호는" 같은 말 금지). 역사학자나 전문 해설사가 아니라는 것도 알고 있어.

[말투와 분위기 — 가장 중요]
- 지식 많은 다정한 선배가 카톡으로 답해 주는 느낌. 해요체, 부드럽고 자연스럽게. 강의하거나 훈계하지 마. 질문한 사람의 호기심이나 고민을 먼저 알아주고, 그다음에 답해.
- 짧게. 한 번에 1~3개의 짧은 메시지(각 1~3문장)로 나눠서. 목록·제목·굵은 글씨·마크다운은 쓰지 마. 이모지는 가끔 1개 이하.
- 질문은 답이 끝난 뒤 가끔만(매번 되묻지 마). 이전 대화 내용을 기억하고 이어서 말해.
- 사용자가 쓴 언어로 답해(한국어가 기본, 영어로 물으면 영어).

[다루는 범위]
도산 안창호 선생의 생애(출생·교육 활동·미국 생활·독립운동·옥고·서거), 활동한 단체와 학교(독립협회·점진학교·공립협회·신민회·대성학교·청년학우회·흥사단·대한인국민회·임시정부 등), 사상과 말씀(무실역행·충의용감, 인격 수양, 점진적 준비, 신뢰와 단결, 정직), 오늘의 우리에게 주는 의미(리더십·인격·공동체·청년의 책임), 도산아카데미·흥사단·도산공원 같은 기념 장소와 단체. 오늘의 삶(진로·관계·리더십 고민)을 도산의 가르침과 연결해 생각해 보도록 돕는 것도 좋아. 이 범위를 벗어난 질문(숙제 대신 하기, 코딩, 정치 성향 판정, 특정 정당·인물 지지 등)은 짧고 부드럽게 정중히 사양하고 도산 이야기로 돌려.

[정확성 — 지어내지 않기]
- 아래 "참고 자료"는 이 앱이 확인해 둔 내용이야. 자료와 네가 아는 널리 알려진 사실이 어긋나면 자료를 따르고, 확실하지 않으면 단정하지 마.
- 연도·장소·단체 이름·직책처럼 확실히 아는 사실만 말해. 확실하지 않은 숫자·날짜는 지어내지 말고 "정확한 건 확인해 보세요"라고 해.
- 도산 선생의 "말씀"을 인용할 때는 아래 참고 자료에 있는 것만 그대로 인용하고 어디서 한 말씀인지(출처 성격)도 말해 줘. 자료에 없는 문장을 선생이 한 말이라고 지어내지 마. 널리 떠도는 어록 중 출처가 불분명한 것은 "그런 취지로 전해지지만 정확한 출처는 확인이 필요해요"라고 해.
- 평가가 갈리는 주제(독립운동 노선 논쟁, 준비론과 무장투쟁론의 비교, 다른 독립운동가와의 비교, 정치적 해석)는 한쪽을 단정하지 말고 주요 시각을 공정하게 소개해. 특정 인물이나 단체를 비방하지 마.
- 오늘의 정치·선거·시사 질문에 도산의 이름을 끌어다 편을 들지 마.

[하지 말 것]
- 도산 선생이 오늘 이 사람에게 이렇게 말씀하실 것이라고 단정하지 마("선생님이 지금 있다면 ~라고 하실 거예요" 같은 말 금지 — 필요하면 "선생의 말씀을 오늘에 비춰 보면 이런 생각을 해볼 수 있어요"처럼 해석임을 분명히).
- 의학·법률·투자 조언 금지(필요하면 전문가에게). 개인정보(전화번호·주소 등)를 묻지 마.

[위기 상황]
자살·자해·학대·폭력 피해·극심한 우울의 신호가 보이면 이야기를 도산으로 돌리려 들지 말고, 먼저 진심으로 공감하고, 혼자 감당하지 않아도 된다고 말하고, 믿을 수 있는 사람(가족·친구·운영진)에게 알리도록 권해. 자살예방 상담전화 109(24시간 무료)를 안내해.

[정직]
AI인지, 사람이 직접 쓰는 건지 물으면 사실대로 "저는 AI예요"라고 말해. 사람처럼 개인 경험이 있는 척하지 마("제가 도산공원에 가 봤는데" 같은 말 금지). 모르는 건 모른다고 말해. 틀릴 수 있으니 중요한 건 책(도산 안창호 관련 도서)이나 흥사단 자료로 확인해 보라고 가끔 상기시켜.

[참고 자료 1 — 확인된 사실]
${FACTS}

[참고 자료 2 — 흥사단 "도산의 말씀"(인용 가능한 것)]
${QUOTES}

출력은 JSON: "messages" 배열에 채팅 메시지 문자열 1~3개.`;

type Msg = { senderId: string; text: string };

async function generate(history: Msg[]): Promise<string[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  // Gemini는 user/model이 번갈아야 해서 같은 쪽 메시지는 줄바꿈으로 합칩니다
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of history) {
    const role = m.senderId === DOSAN_AI_UID ? "model" : "user";
    const last = contents.at(-1);
    if (last && last.role === role) last.parts[0].text += "\n" + m.text;
    else contents.push({ role, parts: [{ text: m.text }] });
  }
  if (contents.at(-1)?.role !== "user") return null;
  for (const model of MODELS) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        signal: AbortSignal.timeout(TRY_MS),
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: SCHEMA,
            temperature: 0.8,
            maxOutputTokens: 700,
            thinkingConfig: { thinkingLevel: THINKING[model] ?? "low" },
          },
        }),
      });
      if (!response.ok) continue; // 붐빔·한도·모델 내려감 → 다음 모델
      const data = (await response.json().catch(() => null)) as {
        promptFeedback?: { blockReason?: string };
        candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      } | null;
      if (data?.promptFeedback?.blockReason) return ["그 이야기는 제가 도와드리기 어려워요. 도산 안창호 선생에 대해 궁금한 게 있다면 편하게 물어봐 주세요."];
      const text = (data?.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join("");
      const out = (JSON.parse(text) as { messages?: unknown }).messages;
      if (!Array.isArray(out)) continue;
      const msgs = out.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 500)).slice(0, 3);
      if (msgs.length) return msgs;
    } catch {
      /* 시간 초과·JSON 오류 → 다음 모델 */
    }
  }
  return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const kstDay = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function POST(request: Request) {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) return Response.json({ ok: false, reason: "not-configured" }, { status: 503 });

  const header = request.headers.get("authorization") ?? "";
  let uid: string;
  try {
    uid = (await auth.verifyIdToken(header.startsWith("Bearer ") ? header.slice(7) : "")).uid;
  } catch {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const user = await db.collection("users").doc(uid).get();
  if (!user.exists || user.get("status") !== "approved") return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const roomRef = db.collection("chatRooms").doc(dosanRoomId(uid)); // 방은 늘 내 방 하나 — 요청에서 방 id를 받지 않음(남의 방에 쓰지 못하게)
  const writeAi = async (text: string) => {
    await roomRef.collection("messages").add({ senderId: DOSAN_AI_UID, senderName: DOSAN_AI_NAME, text, imageUrl: null, createdAt: FieldValue.serverTimestamp() });
    await roomRef.set(
      { kind: "direct", title: "", memberUids: [uid, DOSAN_AI_UID], lastMessageText: text, lastMessageSenderId: DOSAN_AI_UID, lastMessageAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  };

  // 같은 방에서 동시에 두 번 답하지 않게 잠금(25초)
  const locked = await db.runTransaction(async (tx) => {
    const room = await tx.get(roomRef);
    if (Date.now() - ((room.get("aiReplyingAt") as number | undefined) ?? 0) < 25_000) return false;
    tx.set(roomRef, { aiReplyingAt: Date.now() }, { merge: true });
    return true;
  });
  if (!locked) return Response.json({ ok: true, skipped: "busy" });

  try {
    for (let round = 0; round < 2; round++) {
      const snapshot = await roomRef.collection("messages").orderBy("createdAt", "desc").limit(HISTORY).get();
      const history = snapshot.docs
        .map((d) => ({ senderId: d.get("senderId") as string, text: String(d.get("text") ?? "").slice(0, MAX_USER_TEXT) }))
        .filter((m) => m.text)
        .reverse();
      const lastMessage = history.at(-1);
      if (!lastMessage || lastMessage.senderId === DOSAN_AI_UID) break; // 이미 답함

      // 하루 한도 — 한 사람, 전체(무료 한도 보호)
      const day = kstDay();
      const mineRef = db.collection("dosanAiUsage").doc(`${uid}_${day}`);
      const globalRef = db.collection("dosanAiUsage").doc(`all_${day}`);
      const allowed = await db.runTransaction(async (tx) => {
        const [mine, all] = await Promise.all([tx.get(mineRef), tx.get(globalRef)]);
        const mineCount = (mine.get("count") as number | undefined) ?? 0;
        const allCount = (all.get("count") as number | undefined) ?? 0;
        if (mineCount >= DAILY_PER_USER) return "user-limit" as const;
        if (allCount >= DAILY_GLOBAL) return "global-limit" as const;
        tx.set(mineRef, { count: mineCount + 1, uid, day }, { merge: true });
        tx.set(globalRef, { count: allCount + 1, day }, { merge: true });
        return "ok" as const;
      });
      if (allowed !== "ok") {
        await sleep(1500);
        await writeAi(allowed === "user-limit" ? "오늘 나눌 수 있는 대화를 다 썼어요. 내일 다시 이야기해요 🙂" : "지금 이야기하는 분들이 너무 많아서 잠시 쉬고 있어요. 조금 뒤에 다시 말을 걸어 주세요.");
        break;
      }

      const started = Date.now();
      const messages = await generate(history);
      if (!messages) {
        await db.collection("dosanAiUsage").doc(`${uid}_${day}`).set({ count: FieldValue.increment(-1) }, { merge: true }).catch(() => {}); // 못 답했으면 한도에서 뺌
        return Response.json({ ok: false, reason: "no-answer" }, { status: 502 });
      }
      // 위기 신호면 도움 연락처를 반드시 — 모델 답에 이미 109가 있으면 중복이라 붙이지 않음
      if (CRISIS.test(lastMessage.text) && !messages.some((m) => m.includes("109"))) messages.push(CRISIS_NOTE);

      // 읽고 입력하는 시간(글자 수에 비례, 1.5~5초) 뒤에 보냄 — 사람과 채팅하듯
      await sleep(Math.max(0, Math.min(5000, 1500 + messages[0].length * 70) - (Date.now() - started)));
      for (let i = 0; i < messages.length; i++) {
        if (i > 0) await sleep(Math.min(2200, 800 + messages[i].length * 45));
        await writeAi(messages[i]);
      }
    }
  } finally {
    await roomRef.set({ aiReplyingAt: 0 }, { merge: true }).catch(() => {});
  }
  return Response.json({ ok: true });
}
