/**
 * 글씨 크기 배율 — 모든 font-size를 var(--text-scale)배로 (2026-09-25).
 *
 * 설정 화면의 "큰 글씨"는 글씨만 키우고 아이콘·박스·여백은 그대로 둡니다(사용자가 보여 준 온누리상품권 앱처럼).
 * 이 앱은 글씨 크기를 전부 text-[15px]처럼 px로 못 박아 두어서, 뿌리 글씨 크기를 바꿔도 따라오지 않습니다.
 * 그래서 CSS가 만들어질 때 font-size 값을 하나하나
 *     font-size: 15px   →   font-size: calc(15px * var(--text-scale, 1))
 * 로 감싸 둡니다. 평소 --text-scale은 없으므로(=1) 화면은 예전과 똑같고,
 * globals.css의 :root[data-text-scale="large"]가 1.5를 넣으면 모든 글씨가 함께 1.5배가 됩니다.
 *
 * 감싸는 값: px·rem으로 적힌 것과 Tailwind의 var(--text-…)(text-sm 등).
 * 감싸지 않는 값: em·%(부모 글씨를 따르므로 이미 커짐), inherit 같은 낱말, 이미 --text-scale이 든 것.
 *
 * (폰 브라우저의 -webkit-text-size-adjust: 150%로 먼저 해 봤지만 아이폰이 무시해 아무 변화가 없었습니다.)
 */
const SCALE = "var(--text-scale, 1)";

module.exports = () => ({
  postcssPlugin: "agikaeta-text-scale",
  Declaration: {
    "font-size"(decl) {
      const value = decl.value.trim();
      if (value.includes("--text-scale")) return;
      if (!/(\d(px|rem)\b)|^var\(--text-/.test(value)) return;
      decl.value = `calc(${value} * ${SCALE})`;
    },
  },
});
module.exports.postcss = true;
