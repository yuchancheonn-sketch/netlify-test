import type { Metadata } from "next";
import LegalPage, { LegalList, LegalSection } from "@/components/LegalPage";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: `아동 안전 표준 · ${APP_NAME}` };

/**
 * 아동 안전 표준 (사용자 요청 2026-10-26, 구글 플레이 출시 준비 — 뉴웨이브앱 /child-safety를 옮김).
 * 구글 플레이가 소셜·커뮤니티 앱에 요구하는 "아동 성적 학대·착취(CSAE) 금지 기준" 공개 페이지입니다.
 * Play Console > 정책 > 앱 콘텐츠 > 아동 안전 표준 선언의 "게시된 기준" 주소로 /child-safety 를 입력합니다.
 * 내용은 이용약관(/terms) 3~4항과 같아야 하고, 앱 안 신고·차단 기능(components/ModerationDialogs.tsx)과 맞아야 합니다. 법률 검토 전 초안.
 */
export default function ChildSafetyPage() {
  return (
    <LegalPage title="아동 안전 표준" updated="2026년 10월 26일">
      <p>
        {APP_NAME}은 도산아카데미 애기애타 10기 원우회 구성원이 쓰는 앱입니다. 아동·청소년을 성적으로 학대하거나 착취하는 일은 어떤 경우에도 허용하지 않으며,
        아래 기준을 지킵니다.
      </p>
      <LegalSection title="1. 금지하는 것(아동 성적 학대·착취, CSAE)">
        <LegalList
          items={[
            "아동·청소년을 성적으로 묘사하거나 대상화하는 사진·영상·그림·글(아동 성착취물, CSAM)을 올리거나 보내거나 저장하거나 퍼뜨리는 행위",
            "아동·청소년에게 성적으로 접근하거나 길들이기(그루밍)·유인·협박하는 행위, 성적인 대화를 요구하는 행위",
            "아동·청소년의 몸이나 사생활을 허락 없이 촬영·공유하는 행위",
            "위 행위를 알리거나 부추기거나 돕는 모든 글과 대화",
          ]}
        />
        <p>이런 내용은 신고 즉시 삭제하고, 올린 사람의 이용을 영구히 막습니다. 이용약관 3·4항에도 같은 내용을 담고 있습니다.</p>
      </LegalSection>
      <LegalSection title="2. 이용 연령">
        <p>이 앱은 성인 원우회 구성원이 쓰는 앱이며 만 14세 이상만 가입할 수 있고, 가입할 때 이용약관과 개인정보 처리방침에 동의해야 합니다. 불특정 다수가 모이는 공개 채팅방은 없고, 대화는 기수 단체방과 1:1 대화로만 이루어집니다.</p>
      </LegalSection>
      <LegalSection title="3. 신고하는 방법(앱 안)">
        <LegalList
          items={[
            "채팅 메시지는 말풍선을 꾹 눌러 '신고하기'를 누릅니다.",
            "원우소식·자료·투표 같은 글은 글 옆의 메뉴에서 '신고하기'를 누릅니다.",
            "사람은 원우 정보 창에서 '신고하기'나 '차단'을 누릅니다.",
            "신고하면 운영진에게 바로 알림이 가고, 신고한 사람의 이름은 상대에게 알리지 않습니다.",
          ]}
        />
        <p>앱에 들어갈 수 없는 경우에는 아래 이메일로 알려 주셔도 됩니다.</p>
      </LegalSection>
      <LegalSection title="4. 신고를 받았을 때 하는 일">
        <LegalList
          items={[
            "신고가 들어오면 운영진이 24시간 안에 확인합니다.",
            "아동 성적 학대·착취로 확인되면 해당 글·사진·대화를 즉시 삭제하고 올린 사람의 계정을 영구 정지합니다.",
            "필요한 증거를 보관한 뒤, 관련 법령(아동·청소년의 성보호에 관한 법률 등)에 따라 경찰청 등 수사기관(경찰청 사이버범죄 신고시스템 ecrm.police.go.kr, 긴급할 때는 112)에 신고합니다. 해외에서 올라온 것으로 확인되는 자료는 NCMEC(미국 실종·학대아동 보호센터)에도 신고합니다.",
            "아동 안전과 관련한 법과 정책을 따르며, 이 기준은 필요할 때 고쳐 이 페이지에 공개합니다.",
          ]}
        />
      </LegalSection>
      <LegalSection title="5. 아동 안전 담당자">
        <p>
          {APP_NAME} 운영진이 아동 안전을 맡습니다. 신고 처리, 수사기관 협조, 이 기준에 대한 문의는 아래로 연락해 주세요.
        </p>
        <p className="font-bold text-ink">{CONTACT_EMAIL ? CONTACT_EMAIL : "앱 안에서 운영진에게 직접 연락해 주세요."}</p>
      </LegalSection>
    </LegalPage>
  );
}
