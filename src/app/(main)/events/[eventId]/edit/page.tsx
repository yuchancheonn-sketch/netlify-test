"use client";

import { useParams } from "next/navigation";
import EventForm from "@/components/EventForm";
import PageHeader from "@/components/PageHeader";
import { ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useEvent } from "@/lib/hooks";

export default function EditEventPage() {
  const params = useParams<{ eventId: string }>();
  const { isAdmin } = useAuth();
  const { event, loading, notFound } = useEvent(params.eventId);

  return (
    <>
      <PageHeader title="일정 수정" back />
      {!isAdmin ? (
        <ErrorState message="일정 수정은 운영진만 할 수 있어요." />
      ) : loading ? (
        <div className="flex flex-col gap-4 px-5">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : notFound || !event ? (
        <ErrorState message="일정을 찾을 수 없어요." />
      ) : (
        <EventForm event={event} />
      )}
    </>
  );
}
