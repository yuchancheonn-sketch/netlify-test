import type { Metadata } from "next";
import LegalPage, { LegalList, LegalSection } from "@/components/LegalPage";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: `이용약관 · ${APP_NAME}` };

/**
 * 이용약관 (사용자 요청 2026-10-06, 구글 플레이 출시 준비 — 초안). 사용자가 올리는 글이 있는 앱이라
 * "부적절한 콘텐츠 무관용"과 신고·차단·조치 방법을 분명히 적습니다. ★ 법률 검토를 받은 문서가 아닙니다.
 */
export default function TermsPage() {
  return (
    <LegalPage title="이용약관" updated="2026년 10월 6일">
      <LegalSection title="1. 서비스 소개">
        <p>
          {APP_NAME}은 도산아카데미 애기애타 10기 원우회 구성원들이 원우수첩·일정·원우소식·자료·채팅·투표를 함께 쓰는 모임 앱입니다. 운영은 원우회 운영진이 맡습니다.
        </p>
      </LegalSection>
      <LegalSection title="2. 가입과 계정">
        <LegalList
          items={[
            "도산아카데미 애기애타 원우(및 원우회가 허락한 분)가 이용할 수 있습니다.",
            "구글·카카오 계정 또는 휴대폰 번호로 로그인하고, 이름·기수 등 프로필을 입력해 가입합니다.",
            "계정은 본인만 사용하며, 다른 사람에게 빌려주거나 사칭하지 않습니다.",
          ]}
        />
      </LegalSection>
      <LegalSection title="3. 지켜야 할 일 (금지 행위)">
        <p>아래와 같은 글·사진·영상·채팅은 올릴 수 없습니다. 부적절한 콘텐츠와 악의적인 이용에는 관용 없이 대응합니다.</p>
        <LegalList
          items={[
            "욕설·비방·혐오·차별·괴롭힘·협박",
            "음란하거나 폭력적이거나 불쾌감을 주는 내용",
            "다른 사람의 개인정보(전화번호, 사진, 대화 등)를 허락 없이 퍼뜨리는 행위",
            "광고·스팸·사기, 불법 정보, 다른 사람의 저작권·초상권 침해",
            "다른 사람을 사칭하거나 서비스 운영을 방해하는 행위",
          ]}
        />
      </LegalSection>
      <LegalSection title="4. 신고·차단과 운영진의 조치">
        <LegalList
          items={[
            "부적절한 소식·채팅·자료·의견·영상은 글 옆 메뉴나 원우 정보 창에서 '신고하기'로 알릴 수 있고, 불편한 사람은 '차단'해 내 화면에서 보이지 않게 할 수 있습니다. 차단은 설정의 '차단한 사용자'에서 풀 수 있습니다.",
            "신고가 들어오면 운영진이 확인하고, 24시간 안에 글 삭제·경고·이용 제한 등 필요한 조치를 합니다. 신고한 사람의 이름은 상대에게 알리지 않습니다.",
            "금지 행위를 반복하거나 심한 경우 운영진은 글을 삭제하고 계정을 막거나 탈퇴시킬 수 있습니다.",
          ]}
        />
      </LegalSection>
      <LegalSection title="5. 올린 글의 권리">
        <p>
          올린 글·사진의 저작권은 올린 분께 있습니다. 다만 서비스 안에서 원우회 구성원에게 보여 주고 알림으로 전달하는 데 필요한 범위에서 이를 이용하는 것을 허락한 것으로 봅니다.
        </p>
      </LegalSection>
      <LegalSection title="6. 탈퇴">
        <p>설정의 &apos;탈퇴하기&apos;로 언제든 탈퇴할 수 있습니다. 탈퇴하면 개인정보 처리방침에 따라 로그인 계정이 삭제됩니다.</p>
      </LegalSection>
      <LegalSection title="7. 서비스 변경과 책임">
        <LegalList
          items={[
            "서비스는 무료로 제공되며, 운영상 필요하면 기능을 바꾸거나 중단할 수 있습니다. 중요한 변경은 앱 안에서 알립니다.",
            "이용자가 올린 글의 내용에 대한 책임은 올린 이용자에게 있습니다. 운영진은 신고된 내용을 확인하지만 모든 글을 미리 검토하지는 않습니다.",
            "천재지변이나 외부 서비스(구글·카카오 등) 장애로 인한 이용 불편에 대해서는 책임을 지지 않습니다.",
          ]}
        />
      </LegalSection>
      <LegalSection title="8. 문의">
        <p>{CONTACT_EMAIL ? `문의: ${CONTACT_EMAIL}` : "문의나 신고는 앱 안에서 운영진에게 연락해 주세요. 앱의 '신고하기'는 운영진에게 바로 전달됩니다."}</p>
      </LegalSection>
    </LegalPage>
  );
}
