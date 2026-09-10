"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { PrimaryButton, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { cohortOf, inCohort } from "@/lib/cohort";
import { db } from "@/lib/firebase";
import { commitWrite, saveErrorMessage } from "@/lib/firestore-commit";
import { useMemberRegions } from "@/lib/hooks";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  REGION_KEYS,
  REGION_PATHS,
  REGIONS,
  findRegion,
  project,
  regionName,
} from "@/lib/regions";
import { useDragDownToClose } from "@/lib/use-drag-down-to-close";
import { useViewCohort } from "@/lib/use-view-cohort";

/** 지도 위 인원 동그라미의 반지름(지도 칸 단위 — 카드 폭에서 약 12px) */
const BUBBLE_RADIUS = 20;

/**
 * 원우 지도 화면(/map)의 본문 — 원우들이 사는 시·도를 한 장의 지도에 모아 봅니다.
 * (처음엔 홈에 카드째 있었다가, 같은 날 홈 바로가기 "원우 지도"로 들어오는 화면으로 옮겼습니다.)
 *
 *  - 원우가 많은 시·도일수록 진한 주황, 그 위에 인원 수 동그라미.
 *  - 시·도(지도나 아래 알약)를 누르면 거기 사는 원우 이름이 보입니다.
 *  - 맨 아래 "내 지역 등록하기"로 폰 위치를 한 번 읽거나 직접 골라 등록합니다.
 *
 * ★ 정확한 위치는 저장하지 않습니다. 위치는 폰 안에서 곧바로 시·도 이름으로 바꾸고
 *   좌표는 버립니다(lib/regions.ts의 findRegion). 올라가는 것은 "부산" 한 단어뿐입니다.
 *
 * 홈의 다른 칸처럼 보고 있는 기수의 원우만 셉니다(운영진은 제목 옆에서 기수를 바꿈).
 */
export default function MemberMapCard() {
  const { user } = useAuth();
  const { cohort } = useViewCohort();
  const regions = useMemberRegions();
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  /** 시·도 → 그곳 원우 이름들(가나다순). 보고 있는 기수만. */
  const namesByRegion = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of regions.data) {
      if (!inCohort(entry, cohort) || !REGION_KEYS.includes(entry.region)) continue;
      map.set(entry.region, [...(map.get(entry.region) ?? []), entry.name]);
    }
    for (const names of map.values()) names.sort((a, b) => a.localeCompare(b, "ko"));
    return map;
  }, [regions.data, cohort]);

  const countOf = (key: string) => namesByRegion.get(key)?.length ?? 0;
  const maxCount = Math.max(1, ...[...namesByRegion.values()].map((names) => names.length));
  const registered = [...namesByRegion.values()].reduce((sum, names) => sum + names.length, 0);

  /** 아래 알약 줄 — 많은 곳부터, 같으면 지역 순서대로 */
  const ranked = REGION_KEYS.filter((key) => countOf(key) > 0).sort(
    (a, b) => countOf(b) - countOf(a),
  );

  /** 내 줄은 기수와 관계없이 찾습니다 — 내가 등록했는지는 기수를 바꿔 봐도 같아야 합니다. */
  const mine = regions.data.find((entry) => entry.uid === user?.uid);
  const myRegion = mine && REGION_KEYS.includes(mine.region) ? mine.region : null;

  const selectedPath = selected ? REGION_PATHS.find((path) => path.key === selected) : null;

  function toggle(key: string) {
    setSelected((previous) => (previous === key ? null : key));
  }

  return (
    <>
      <section className="rounded-3xl bg-surface px-5 pt-5 pb-5 shadow-[var(--shadow-card)]">
        {/* 제목은 화면 머리("원우 지도")에 있어서, 카드 안에는 등록한 인원만 둡니다. */}
        {registered > 0 ? (
          <p className="text-right text-[13px] font-medium text-ink-muted">{registered}명 등록</p>
        ) : null}

        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="mx-auto mt-2 block h-auto w-full max-w-[340px]"
          role="img"
          aria-label={
            ranked.length > 0
              ? `원우 지도: ${ranked.map((key) => `${key} ${countOf(key)}명`).join(", ")}`
              : "원우 지도: 아직 등록한 원우가 없어요"
          }
        >
          {REGION_PATHS.map(({ key, d }) => {
            const count = countOf(key);
            return (
              <path
                key={key}
                d={d}
                fillRule="evenodd"
                // 원우가 있는 곳은 주황을 사람 수만큼 진하게, 없는 곳은 옅은 회색.
                fill={count > 0 ? "var(--color-brand-500)" : "var(--color-line)"}
                fillOpacity={count > 0 ? 0.3 + 0.6 * (count / maxCount) : 1}
                stroke="var(--color-surface)"
                strokeWidth={1.5}
                strokeLinejoin="round"
                onClick={() => toggle(key)}
                className="cursor-pointer"
              />
            );
          })}

          {/* 고른 시·도의 테두리는 맨 위에 한 번 더 그립니다 — 이웃 칸의 흰 선에 가려지지 않게. */}
          {selectedPath ? (
            <path
              d={selectedPath.d}
              fillRule="evenodd"
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={3}
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ) : null}

          {REGIONS.filter((region) => countOf(region.key) > 0).map((region) => {
            const [x, y] = project(region.label[0], region.label[1]);
            return (
              <g key={region.key} pointerEvents="none">
                <circle
                  cx={x}
                  cy={y}
                  r={BUBBLE_RADIUS}
                  fill="var(--color-brand-500)"
                  stroke="var(--color-surface)"
                  strokeWidth={3}
                />
                <text
                  x={x}
                  y={y}
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize={22}
                  fontWeight={700}
                  fill="#ffffff"
                >
                  {countOf(region.key)}
                </text>
              </g>
            );
          })}
        </svg>

        {regions.error ? (
          <p className="mt-3 text-center text-[13px] font-medium text-danger">{regions.error}</p>
        ) : null}

        {ranked.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ranked.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                aria-pressed={selected === key}
                className={`rounded-full px-3 py-1.5 text-[13px]! font-bold transition ${
                  selected === key ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500"
                }`}
              >
                {key} {countOf(key)}
              </button>
            ))}
          </div>
        ) : null}

        {selected ? (
          <p className="mt-3 text-[14px] leading-relaxed break-keep text-ink-soft">
            <span className="font-bold text-ink">{regionName(selected)}</span>{" "}
            {countOf(selected) > 0
              ? namesByRegion.get(selected)?.join(" · ")
              : "아직 등록한 원우가 없어요"}
          </p>
        ) : null}

        <div className="mt-4 border-t border-line pt-4">
          {myRegion ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] text-ink-soft">
                내 지역 <span className="font-bold text-ink">{myRegion}</span>
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 rounded-lg border border-ink-muted px-2.5 py-1 text-[13px]! font-bold text-ink-muted transition active:scale-95"
              >
                바꾸기
              </button>
            </div>
          ) : (
            <PrimaryButton size="compact" onClick={() => setSheetOpen(true)}>
              내 지역 등록하기
            </PrimaryButton>
          )}
        </div>
      </section>

      {sheetOpen ? <RegionSheet current={myRegion} onClose={() => setSheetOpen(false)} /> : null}
    </>
  );
}

/**
 * 내 지역을 등록·변경·삭제하는 시트.
 * 폰 위치로 한 번 찾거나, 위치를 못 쓰면(권한 거부·해외·주소가 http 등) 직접 고릅니다.
 */
function RegionSheet({ current, onClose }: { current: string | null; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [locating, setLocating] = useState(false);
  /** 지금 저장 중인 값("서울" 등), 지우는 중이면 "" */
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { handleTouchHandlers, sheetStyle } = useDragDownToClose(onClose);
  const busy = locating || saving !== null;

  async function save(region: string) {
    if (!user || !profile) return;
    setSaving(region);
    setMessage(null);
    try {
      // 응답을 잠깐만 기다리고 닫습니다 — 이유는 lib/firestore-commit.ts에.
      await commitWrite(
        setDoc(doc(db, "memberRegions", user.uid), {
          uid: user.uid,
          region,
          cohort: cohortOf(profile.cohort),
          name: profile.name || profile.nickname || "원우",
          updatedAt: serverTimestamp(),
        }),
      );
      onClose();
    } catch (caught) {
      setMessage(
        saveErrorMessage(
          caught,
          "저장 권한이 없어요. 운영진에게 알려주세요. (Firestore 보안 규칙 게시 필요 · permission-denied)",
        ),
      );
      setSaving(null);
    }
  }

  async function remove() {
    if (!user) return;
    setSaving("");
    setMessage(null);
    try {
      await commitWrite(deleteDoc(doc(db, "memberRegions", user.uid)));
      onClose();
    } catch (caught) {
      setMessage(saveErrorMessage(caught));
      setSaving(null);
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setMessage("이 기기에서는 위치를 쓸 수 없어요. 아래에서 직접 골라 주세요.");
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // 좌표는 여기서 시·도를 가려내는 데만 쓰고 버립니다.
        const region = findRegion(position.coords.longitude, position.coords.latitude);
        setLocating(false);
        if (region) void save(region);
        else setMessage("국내 시·도를 찾지 못했어요. 아래에서 직접 골라 주세요.");
      },
      (error) => {
        setLocating(false);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "위치 권한이 꺼져 있어요. 아래에서 직접 골라 주세요."
            : "위치를 찾지 못했어요. 아래에서 직접 골라 주세요.",
        );
      },
      // 시·도만 알면 되니 정밀 측위(배터리·시간)는 쓰지 않고, 10분 안의 위치는 다시 씁니다.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-label="내 지역 등록"
      onClick={onClose}
      /*
        원우 지도 화면은 오른쪽으로 밀면 홈으로 갑니다(use-swipe-back). 이 시트 위에서
        시작한 손짓까지 그걸로 읽으면 시트를 쓰다가 화면이 밀려나므로 빼 둡니다.
      */
      data-no-swipe-back
    >
      {/* 손잡이는 스크롤 밖에 따로 둡니다 — 이유는 MemberEditSheet의 같은 자리 설명을 참고하세요. */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[16px] bg-canvas sm:rounded-[16px]"
        style={sheetStyle}
      >
        <div
          {...handleTouchHandlers}
          aria-hidden="true"
          className="flex shrink-0 touch-none justify-center pt-3 pb-2"
        >
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(28px+env(safe-area-inset-bottom))] sm:pb-7">
          <h2 className="text-[19px] font-bold text-ink">내 지역 등록</h2>
          {/* 위치를 묻기 전에 무엇이 남는지 알려야 해서, 이 한 줄은 줄이지 않습니다. */}
          <p className="mt-1 mb-5 text-[13px] leading-relaxed text-ink-faint">
            정확한 위치는 저장하지 않고, 시·도 이름만 원우 지도에 남아요.
          </p>

          <PrimaryButton onClick={locate} loading={locating} disabled={saving !== null}>
            현재 위치로 찾기
          </PrimaryButton>

          {message ? (
            <p role="alert" className="mt-3 text-center text-[13px] font-medium text-danger">
              {message}
            </p>
          ) : null}

          <p className="mt-6 mb-2 text-[15px] font-bold text-ink">직접 고르기</p>
          <div className="grid grid-cols-3 gap-2">
            {REGION_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => void save(key)}
                disabled={busy}
                aria-pressed={current === key}
                className={`flex h-12 items-center justify-center rounded-2xl text-[15px]! font-bold transition active:scale-[0.98] ${
                  current === key
                    ? "bg-brand-500 text-white"
                    : "bg-surface text-ink shadow-[var(--shadow-card)]"
                }`}
              >
                {saving === key ? <Spinner className="h-4 w-4" /> : key}
              </button>
            ))}
          </div>

          {current ? (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="mt-5 w-full py-2 text-[14px]! font-bold text-danger"
            >
              {saving === "" ? "지우는 중…" : "내 지역 지우기"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-2xl py-3 text-[15px] font-bold text-ink-faint"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
