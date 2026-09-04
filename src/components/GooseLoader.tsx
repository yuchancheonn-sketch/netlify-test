/**
 * 불러오는 동안 날갯짓하는 기러기.
 *
 * 도산아카데미 로고(public/brand/goose.png)의 기러기를 위에서 내려다본 모습
 * 그대로 다시 그렸습니다. 그림 파일을 두고 SVG로 옮긴 이유는 하나입니다 —
 * 날개만 따로 움직이려면 날개가 몸통과 분리된 도형이어야 합니다.
 *
 * 몸통을 마지막에 그립니다. 날개 뿌리가 몸통 밑으로 들어가야 날개가 몸에
 * 붙어 있는 것처럼 보입니다.
 *
 * 왼쪽 날개는 오른쪽 날개를 통째로 뒤집어 씁니다. 뒤집기는 바깥 g가 맡고
 * 날갯짓은 안쪽 g가 맡습니다. 한 요소에 둘을 같이 걸면 CSS 애니메이션이
 * transform 속성을 통째로 덮어써서 뒤집기가 사라집니다.
 *
 * 날갯짓 자체(각도·속도)는 globals.css의 goose-flap에 있습니다.
 */

/** 오른쪽 날개 — 뿌리가 넓고 끝으로 갈수록 뾰족해집니다. */
const WING =
  "M57 41c15 0 35 1.5 49 3.5 5 .7 8.6 1.5 10.4 2.1 1.4.5 1.2 2-.4 2.3-10 1.9-24 6.1-36 11.1-9 3.8-15.4 7.4-18.6 9.8-1.4 1-3.2.2-3.4-1.8z";

/** 몸통 — 위로 가늘고 긴 목과 뾰족한 부리, 아래로 갈라진 꼬리. */
const BODY =
  "M60 8c2.6 2.5 3.4 5.5 3.2 9-.2 3.5-.8 7-1 11-.2 5-.2 9 .2 13 .5 4.5 1.6 8 2.8 11 2.8 6 4.4 12.5 4.4 19.5 0 7-1 12.5-2.4 16.5l-.8 12-3.5-11.4L61.4 101h-2.8l-1.5-12.4L53.6 100l-.8-12c-1.4-4-2.4-9.5-2.4-16.5 0-7 1.6-13.5 4.4-19.5 1.2-3 2.3-6.5 2.8-11 .4-4 .4-8 .2-13-.2-4-.8-7.5-1-11-.2-3.5.6-6.5 3.2-9z";

/**
 * 날개가 도는 중심은 어깨(날개 뿌리의 한가운데)입니다.
 * 뿌리 끝을 중심으로 잡으면 날갯짓할 때마다 뿌리가 몸통에서 떨어졌다 붙습니다.
 *
 * transform-box를 view-box로 두어야 아래 좌표를 그림 좌표(0~120) 그대로 읽습니다.
 */
const wingStyle: React.CSSProperties = {
  transformBox: "view-box",
  transformOrigin: "58px 54px",
};

export default function GooseLoader({ size = 104 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="불러오는 중이에요"
    >
      <defs>
        {/*
          로고와 같은 남색→파랑 그라데이션.
          navy는 도산아카데미 심볼 색이고, 밝은 쪽은 로고 오른쪽 날개의 색입니다.
        */}
        <linearGradient id="goose-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-navy)" />
          <stop offset="100%" stopColor="#2a7fc4" />
        </linearGradient>
      </defs>

      <g className="goose-bob" fill="url(#goose-blue)">
        <g className="goose-wing" style={wingStyle}>
          <path d={WING} />
        </g>

        {/* 왼쪽 날개 — 오른쪽을 좌우로 뒤집은 것입니다. */}
        <g transform="translate(120 0) scale(-1 1)">
          <g className="goose-wing" style={wingStyle}>
            <path d={WING} />
          </g>
        </g>

        <path d={BODY} />
      </g>
    </svg>
  );
}
