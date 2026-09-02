"use client";

import EventForm from "@/components/EventForm";
import PageHeader from "@/components/PageHeader";
import { ErrorState } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function NewEventPage() {
  const { isAdmin } = useAuth();

  return (
    <>
      <PageHeader title="일정 등록" back />
      {isAdmin ? (
        <EventForm />
      ) : (
        <ErrorState message="일정 등록은 운영진만 할 수 있어요." />
      )}
    </>
  );
}
