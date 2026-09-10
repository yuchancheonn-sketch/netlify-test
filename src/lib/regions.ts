import SHAPES_JSON from "@/lib/korea-provinces.json";

/**
 * 원우 지도의 시·도 — 경계 모양, 위치로 시·도 찾기, 지도 그리기.
 *
 * 경계(korea-provinces.json)는 통계청 2013년 시·도 경계를 간략화한 공개 자료
 * (github.com/southkorea/southkorea-maps 의 kostat/2013 skorea_provinces_geo_simple)를
 * 소수 셋째 자리(약 100m)로 줄여 담았습니다. 시·도 경계는 그 뒤로 바뀌지 않았고,
 * 이름만 지금 부르는 짧은 이름으로 바꿨습니다(강원도→강원, 전라북도→전북 — 둘 다 뒤에
 * 특별자치도가 되었습니다). 좌표는 [경도, 위도]이고, 폴리곤마다 첫 고리가 바깥,
 * 나머지는 구멍입니다(전남 안의 광주처럼).
 *
 * 2026-09-11 확인: 서울·경기 경계(부천·김포·분당), 해안(다대포·송도),
 * 섬(울릉도·서귀포)을 포함한 30곳을 넣어 모두 맞는 시·도를 찾았고,
 * 도쿄·베이징은 "못 찾음"이 나왔습니다.
 */

type Ring = number[][];
type Polygon = Ring[];
interface Shape {
  key: string;
  polygons: Polygon[];
}

const SHAPES = SHAPES_JSON as Shape[];

export interface RegionInfo {
  /** 저장하고 화면에 쓰는 짧은 이름 */
  key: string;
  /** 지역을 눌렀을 때 보이는 정식 이름 */
  name: string;
  /**
   * 지도에 인원 동그라미를 놓을 자리 [경도, 위도].
   * 한가운데가 아니라 손으로 맞춘 자리입니다 — 서울·인천·경기, 세종·대전·충남,
   * 광주·전남처럼 좁게 붙은 곳의 동그라미가 서로 겹치지 않게 비켜 두었습니다.
   */
  label: [number, number];
}

export const REGIONS: RegionInfo[] = [
  { key: "서울", name: "서울특별시", label: [127.02, 37.6] },
  { key: "경기", name: "경기도", label: [127.5, 37.3] },
  { key: "인천", name: "인천광역시", label: [126.45, 37.45] },
  { key: "강원", name: "강원특별자치도", label: [128.3, 37.75] },
  { key: "충북", name: "충청북도", label: [127.75, 36.85] },
  { key: "충남", name: "충청남도", label: [126.7, 36.45] },
  { key: "세종", name: "세종특별자치시", label: [127.2, 36.62] },
  { key: "대전", name: "대전광역시", label: [127.5, 36.28] },
  { key: "전북", name: "전북특별자치도", label: [127.1, 35.72] },
  { key: "광주", name: "광주광역시", label: [126.85, 35.16] },
  { key: "전남", name: "전라남도", label: [126.75, 34.75] },
  { key: "경북", name: "경상북도", label: [128.75, 36.35] },
  { key: "대구", name: "대구광역시", label: [128.6, 35.87] },
  { key: "울산", name: "울산광역시", label: [129.3, 35.55] },
  { key: "경남", name: "경상남도", label: [128.25, 35.3] },
  { key: "부산", name: "부산광역시", label: [129.05, 35.18] },
  { key: "제주", name: "제주특별자치도", label: [126.55, 33.38] },
];

/** 나라 밖에 사는 원우. 지도에는 칸이 없고 아래 목록에만 셉니다. */
export const ABROAD = "해외";

/** 저장할 수 있는 값 전부 — 시·도 17곳과 해외 */
export const REGION_KEYS: string[] = [...REGIONS.map((region) => region.key), ABROAD];

export function regionName(key: string): string {
  return REGIONS.find((region) => region.key === key)?.name ?? key;
}

/* ------------------------------------------------------------------ */
/* 위치 → 시·도                                                          */
/* ------------------------------------------------------------------ */

function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 바깥 고리 안이면서 구멍(예: 전남 안의 광주)에는 들지 않을 때 */
function inPolygon(lon: number, lat: number, polygon: Polygon): boolean {
  return inRing(lon, lat, polygon[0]) && !polygon.slice(1).some((hole) => inRing(lon, lat, hole));
}

function ringArea(ring: Ring): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(area / 2);
}

const AREA = new Map(
  SHAPES.map((shape) => [shape.key, shape.polygons.reduce((sum, p) => sum + ringArea(p[0]), 0)]),
);

/**
 * 해안선에서 이만큼(도, 약 10km) 안이면 가장 가까운 시·도로 봅니다.
 * 경계를 간략화해서 바닷가 아파트나 작은 섬이 지도 선 바깥에 떨어질 수 있습니다.
 */
const NEAREST_LIMIT = 0.09;

/**
 * 경도·위도가 어느 시·도인지. 나라 밖이면 null.
 *
 * 좌표는 이 함수 안에서만 쓰고 어디에도 남기지 않습니다 — 부르는 쪽도 결과(이름)만 저장합니다.
 */
export function findRegion(lon: number, lat: number): string | null {
  const hits = SHAPES.filter((shape) => shape.polygons.some((p) => inPolygon(lon, lat, p)));
  if (hits.length > 0) {
    // 간략화한 경계가 겹치는 드문 자리에서는 좁은 쪽(광역시)을 고릅니다.
    return hits.sort((a, b) => (AREA.get(a.key) ?? 0) - (AREA.get(b.key) ?? 0))[0].key;
  }

  const cos = Math.cos((lat * Math.PI) / 180);
  let nearest: string | null = null;
  let nearestDistance = Infinity;
  for (const shape of SHAPES) {
    for (const polygon of shape.polygons) {
      for (const [x, y] of polygon[0]) {
        const distance = Math.hypot((x - lon) * cos, y - lat);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = shape.key;
        }
      }
    }
  }
  return nearestDistance <= NEAREST_LIMIT ? nearest : null;
}

/* ------------------------------------------------------------------ */
/* 지도 그리기                                                           */
/* ------------------------------------------------------------------ */

/*
 * 위도 1도를 100칸으로, 경도는 한반도 가운데(북위 36도)의 cos만큼 좁혀 그립니다.
 * 이 정도 넓이에서는 이 간단한 투영으로도 모양이 눈에 익은 지도와 같습니다.
 */
const LON0 = 124.5;
const LAT0 = 38.75;
const X_SCALE = Math.cos((36 * Math.PI) / 180) * 100;
const Y_SCALE = 100;

export const MAP_WIDTH = Math.ceil((131.05 - LON0) * X_SCALE);
export const MAP_HEIGHT = Math.ceil((LAT0 - 33.05) * Y_SCALE);

/** [경도, 위도] → 지도 안의 [x, y] */
export function project(lon: number, lat: number): [number, number] {
  return [(lon - LON0) * X_SCALE, (LAT0 - lat) * Y_SCALE];
}

/** 시·도마다 SVG path 한 줄. 구멍이 뚫리도록 fill-rule="evenodd"로 그리세요. */
export const REGION_PATHS: { key: string; d: string }[] = SHAPES.map((shape) => ({
  key: shape.key,
  d: shape.polygons
    .flatMap((polygon) =>
      polygon.map(
        (ring) =>
          ring
            .map(([lon, lat], index) => {
              const [x, y] = project(lon, lat);
              return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join("") + "Z",
      ),
    )
    .join(""),
}));
