import { WRITE_ACK_TIMEOUT } from "@/lib/constants";

/**
 * 저장이 어떻게 끝났는지.
 *  - saved  : 서버가 받았습니다.
 *  - queued : 아직 못 받았지만 기기 안 대기열에 들어갔습니다. 연결되면 올라갑니다.
 * 둘 다 "다음 화면으로 넘어가도 되는" 상태입니다.
 */
export type CommitResult = "saved" | "queued";

/**
 * Firestore 쓰기를 "기다리되, 영영 기다리지는 않게" 합니다.
 *
 * 왜 필요한가 ─────────────────────────────────────────────
 * 이 앱은 오프라인 캐시를 켜두었습니다(`lib/firebase.ts`). 그래서 setDoc이나
 * updateDoc이 돌려주는 약속은 "기기에 적혔다"가 아니라 "서버가 받았다"입니다.
 * 신호가 약하거나 무료 한도를 넘긴 동안에는 그 약속이 영영 풀리지 않습니다.
 *
 * 그런데 화면들은 하나같이 `await setDoc(...)` 다음 줄에서 창을 닫거나 다음
 * 화면으로 넘어갑니다. 약속이 안 풀리면 그 다음 줄에 영영 닿지 못해서,
 * 저장 버튼이 계속 돌기만 하고 아무 일도 일어나지 않습니다.
 * 정작 내용은 이미 기기에 적혀 있는데도요.
 *
 * 어떻게 푸는가 ───────────────────────────────────────────
 * 응답을 {@link WRITE_ACK_TIMEOUT}까지만 기다립니다.
 *  - 그 안에 성공하면 "saved"
 *  - 그 안에 거절당하면 예외를 던집니다 (권한 없음 같은 진짜 오류는 그대로 보임)
 *  - 그 안에 아무 소식이 없으면 "queued" — 기다리기를 그만두고 넘어갑니다
 *
 * 넘어가도 적은 내용은 사라지지 않습니다. Firestore가 쓰기를 기기 안에 먼저
 * 적어두고 화면에도 바로 반영한 뒤, 연결되면 알아서 올려보냅니다.
 * 앱을 껐다 켜도 그 대기열은 남습니다.
 *
 * 무엇을 포기했는가 ─────────────────────────────────────────
 * 제한 시간이 지난 뒤에 도착하는 거절은 아무에게도 알리지 못합니다.
 * (연결이 아주 느린데 마침 권한도 없는 경우) 그래도 "저장은 됐는데 화면이
 * 멈춰 있는" 쪽보다는 낫다고 봤습니다. 흔한 쪽은 압도적으로 전자입니다.
 *
 * @param writes 쓰기 하나, 또는 함께 끝나야 하는 쓰기 여럿
 * @param timeout 기다려줄 시간(밀리초). 사진 올리기처럼 원래 오래 걸리는
 *                작업은 늘려 잡으세요.
 */
export function commitWrite(
  writes: Promise<unknown> | Promise<unknown>[],
  timeout: number = WRITE_ACK_TIMEOUT,
): Promise<CommitResult> {
  const acked = (Array.isArray(writes) ? Promise.all(writes) : writes).then(
    () => "saved" as const,
  );

  /*
   * 제한 시간이 지난 뒤에 거절이 도착할 수 있습니다. 그때 이 약속을 받아주는
   * 곳이 없으면 브라우저가 "처리되지 않은 오류(unhandled rejection)"로 보고
   * 콘솔에 빨간 줄을 남깁니다. 아래 경주와 별개로 받아줄 사람을 하나 붙여둡니다.
   */
  acked.catch(() => {});

  let timer: ReturnType<typeof setTimeout>;

  return Promise.race([
    acked,
    new Promise<CommitResult>((resolve) => {
      timer = setTimeout(() => resolve("queued"), timeout);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * 저장에 실패했을 때 원우에게 보여줄 말.
 *
 * permission-denied는 "보안 규칙을 아직 콘솔에 올리지 않았다"는 뜻일 때가
 * 많습니다. 원우가 이 화면을 찍어 보내주면 운영진이 바로 알아볼 수 있도록
 * 코드를 괄호 안에 남깁니다.
 */
export function saveErrorMessage(caught: unknown, denied?: string): string {
  const code = (caught as { code?: string })?.code ?? "";
  if (code === "permission-denied" && denied) return denied;
  return `저장하지 못했어요. 잠시 후 다시 시도해 주세요.${code ? ` (${code})` : ""}`;
}
