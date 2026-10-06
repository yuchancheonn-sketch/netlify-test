import type { Metadata } from "next";
import LegalPage, { LegalList, LegalSection } from "@/components/LegalPage";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: `계정·데이터 삭제 · ${APP_NAME}` };

/**
 * 계정·데이터 삭제 안내 (2026-10-06 사용자 요청 (구글 플레이 출시 준비), 뉴웨이브앱 account-deletion을 이 앱에 맞춰 옮김).
 * 구글 플레이가 "앱 밖에서도 볼 수 있는 삭제 방법 주소"를 요구해서 만든 페이지입니다. 로그인 없이 열립니다((main) 바깥이라 StageGate를 안 거침).
 * ★ 내용은 개인정보 처리방침 4항·실제 탈퇴 동작(lib/account-withdraw-server.ts)과 같아야 합니다. 한쪽을 고치면 같이 고치세요.
 */
export default function AccountDeletionPage() {
  return (
    <LegalPage title="계정·데이터 삭제 방법" updated="2026년 10월 6일">
      <LegalSection title="앱에서 직접 삭제">
        <LegalList
          items={[
            `${APP_NAME} 앱에 로그인합니다.`,
            "화면 위쪽의 톱니바퀴(설정) 아이콘을 누릅니다.",
            "맨 아래 '탈퇴하기'를 누르고 안내에 따라 확인합니다.",
          ]}
        />
        <p>탈퇴하면 바로 처리되고, 되돌릴 수 없습니다.</p>
      </LegalSection>
      <LegalSection title="계정은 두고 올린 글만 삭제">
        <p>탈퇴하지 않아도 내가 올린 글은 앱에서 직접 지울 수 있습니다. 각 글의 메뉴(또는 &apos;삭제&apos; 단추)에서 지웁니다.</p>
        <LegalList
          items={[
            "원우소식에 올린 사진·글(앨범)",
            "내가 만든 투표와 내가 남긴 의견·댓글",
            "내가 보낸 채팅 메시지",
          ]}
        />
        <p>지운 글과 사진은 서비스에서 보이지 않게 되며, 지울 수 없는 내용은 아래 연락처로 요청해 주세요.</p>
      </LegalSection>
      <LegalSection title="탈퇴하면 삭제되는 정보">
        <LegalList
          items={[
            "로그인 계정(구글·카카오·휴대폰 인증으로 만든 계정 모두)",
            "계정 정보: 프로필 사진, 생일, 이메일, 권한",
            "알림을 받는 기기 정보(기기 토큰), 내가 차단한 사람 목록, 내가 올린 신고 기록",
          ]}
        />
      </LegalSection>
      <LegalSection title="남는 정보">
        <LegalList
          items={[
            "원우수첩에는 원우 명단이 끊기지 않도록 이름·기수·회사·직책·연락처·자기소개 등이 '가입 전' 칸으로 남습니다(프로필 사진은 지워집니다). 이것도 지우고 싶으면 아래 연락처로 요청해 주세요.",
            "올린 소식·채팅·투표·댓글은 서비스 기록으로 남고, 작성자는 글에 적어 둔 이름으로 보입니다. 삭제를 원하면 아래 연락처로 요청해 주세요.",
            "신고 처리 기록은 재발 방지를 위해 필요한 기간 동안 보관한 뒤 삭제합니다.",
          ]}
        />
      </LegalSection>
      <LegalSection title="앱에 들어갈 수 없을 때">
        <p>
          앱에 로그인할 수 없다면 {CONTACT_EMAIL ? CONTACT_EMAIL : "원우회 운영진"}으로 가입한 이름과 기수, 전화번호 뒷 4자리를 알려 주세요. 본인 확인 뒤 삭제해 드립니다.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
