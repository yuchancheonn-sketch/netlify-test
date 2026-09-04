/**
 * 불러오는 동안 보여주는 도산아카데미 로고 — 기러기만 날갯짓합니다.
 *
 * 원본 로고 그림(public/brand/goose.png) 위에 움직이는 기러기를 얹는 방법은
 * 쓸 수 없습니다. 날개를 올리면 그림에 박혀 있는 원래 날개가 뒤로 삐져나옵니다.
 * 가운데만 흰색으로 덮어 지우는 방법도 안 됩니다 — 날개 끝이 바깥 글씨 고리보다
 * 더 멀리 뻗어 있어서, 기러기를 덮을 만한 원을 그리면 글자까지 지워집니다.
 * 그래서 고리 글씨와 기러기를 통째로 SVG로 다시 그렸습니다.
 *
 * 기러기 모양은 원본과 나란히 놓고 눈으로 맞춰가며 잡았습니다.
 * 고칠 일이 있으면 원본(public/brand/goose.png)과 나란히 그려놓고 비교하세요.
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

/** 오른쪽 날개 — 뿌리가 넓고 바깥으로 갈수록 아래로 처지며 뾰족해집니다. */
const WING =
  "M61 44c12-2 25-2 35 .6 8 2 15 5.4 19.6 8.8 1.8 1.4 1 3.6-1.4 3.4-10-.8-22 .8-32 3.8-8.6 2.6-15.4 6-19.4 9-1.8 1.4-3.4.4-3.2-2z";

/** 몸통 — 위로 목과 머리, 아래로 갈라진 꼬리. */
const BODY =
  "M60 15C62 16.6 63.4 19 63.6 22 63.8 25.4 63.2 28.4 63 31 62.7 34.6 62.6 38 62.8 41.4 63 44.6 63.6 47.4 64.4 50 66.8 56.4 68.8 62.6 69.2 70 69.5 76 68.9 81.8 67.7 86L66.7 96 63.1 85.8 61.6 97H58.4L56.9 85.8 53.3 96 52.3 86C51.1 81.8 50.5 76 50.8 70 51.2 62.6 53.2 56.4 55.6 50 56.4 47.4 57 44.6 57.2 41.4 57.4 38 57.3 34.6 57 31 56.8 28.4 56.2 25.4 56.4 22 56.6 19 58 16.6 60 15Z";

/**
 * 날개가 도는 중심은 어깨(날개 뿌리의 한가운데)입니다.
 * 뿌리 끝을 중심으로 잡으면 날갯짓할 때마다 뿌리가 몸통에서 떨어졌다 붙습니다.
 *
 * 좌표는 기러기를 담은 안쪽 <svg>의 좌표(0~120)입니다. transform-box를
 * view-box로 두어야 그 좌표를 그대로 읽습니다. 기러기를 안쪽 <svg>로 한 번 더
 * 감싼 이유가 이것입니다 — 바깥 로고 좌표(0~200) 위에서 크기를 줄이는
 * transform을 걸면, 그 안에서 이 중심점이 어디로 가는지가 흐려집니다.
 */
const wingStyle: React.CSSProperties = {
  transformBox: "view-box",
  transformOrigin: "60px 56px",
};

export default function GooseLoader({ size = 176 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="불러오는 중이에요"
      fill="var(--color-navy)"
    >
      <defs>
        {/*
          글씨가 앉는 두 개의 고리.
          위 글씨는 왼쪽에서 오른쪽으로 위를 넘어가고(sweep 1), 아래 글씨는
          왼쪽에서 오른쪽으로 아래를 지납니다(sweep 0). 둘 다 왼→오른쪽이라
          글자가 똑바로 서고, 아래 글씨도 뒤집히지 않고 읽힙니다.
        */}
        <path id="dosan-ring-top" d="M 16,100 A 84,84 0 0,1 184,100" />
        <path id="dosan-ring-bottom" d="M 15,100 A 85,85 0 0,0 185,100" />
      </defs>

      {/*
        고리 글씨는 가만히 있습니다. 움직이는 것은 아래 기러기의 날개뿐입니다.
        startOffset이 딱 50%가 아닌 이유: 자간(letterSpacing)이 마지막 글자
        뒤에도 붙어서, 50%에 두면 글씨 덩어리가 그 절반만큼 왼쪽으로 치우칩니다.
      */}
      <g fontSize="16" fontWeight="700" letterSpacing="3.6">
        <text>
          <textPath href="#dosan-ring-top" startOffset="50.35%" textAnchor="middle">
            DOSAN ACADEMY
          </textPath>
        </text>
        <text>
          <textPath href="#dosan-ring-bottom" startOffset="50.35%" textAnchor="middle">
            SINCE 1989
          </textPath>
        </text>
      </g>

      <svg x="18" y="23" width="164" height="164" viewBox="0 0 120 120">
        <g className="goose-bob">
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
    </svg>
  );
}
