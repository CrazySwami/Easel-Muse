create extension if not exists "pgjwt" with schema "extensions";


create table "public"."profile" (
    "id" text not null,
    "customer_id" text,
    "subscription_id" text,
    "product_id" text,
    "onboarded_at" timestamp without time zone
);


create table "public"."project" (
    "id" text not null default uuid_generate_v4(),
    "name" character varying not null,
    "transcription_model" character varying not null,
    "vision_model" character varying not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone,
    "content" json,
    "user_id" character varying not null,
    "image" character varying,
    "members" text[],
    "demo_project" boolean not null default false,
    "chat_history" json
);


CREATE UNIQUE INDEX profile_pkey ON public.profile USING btree (id);

CREATE UNIQUE INDEX project_pkey ON public.project USING btree (id);

alter table "public"."profile" add constraint "profile_pkey" PRIMARY KEY using index "profile_pkey";

alter table "public"."project" add constraint "project_pkey" PRIMARY KEY using index "project_pkey";

grant delete on table "public"."profile" to "anon";

grant insert on table "public"."profile" to "anon";

grant references on table "public"."profile" to "anon";

grant select on table "public"."profile" to "anon";

grant trigger on table "public"."profile" to "anon";

grant truncate on table "public"."profile" to "anon";

grant update on table "public"."profile" to "anon";

grant delete on table "public"."profile" to "authenticated";

grant insert on table "public"."profile" to "authenticated";

grant references on table "public"."profile" to "authenticated";

grant select on table "public"."profile" to "authenticated";

grant trigger on table "public"."profile" to "authenticated";

grant truncate on table "public"."profile" to "authenticated";

grant update on table "public"."profile" to "authenticated";

grant delete on table "public"."profile" to "service_role";

grant insert on table "public"."profile" to "service_role";

grant references on table "public"."profile" to "service_role";

grant select on table "public"."profile" to "service_role";

grant trigger on table "public"."profile" to "service_role";

grant truncate on table "public"."profile" to "service_role";

grant update on table "public"."profile" to "service_role";

grant delete on table "public"."project" to "anon";

grant insert on table "public"."project" to "anon";

grant references on table "public"."project" to "anon";

grant select on table "public"."project" to "anon";

grant trigger on table "public"."project" to "anon";

grant truncate on table "public"."project" to "anon";

grant update on table "public"."project" to "anon";

grant delete on table "public"."project" to "authenticated";

grant insert on table "public"."project" to "authenticated";

grant references on table "public"."project" to "authenticated";

grant select on table "public"."project" to "authenticated";

grant trigger on table "public"."project" to "authenticated";

grant truncate on table "public"."project" to "authenticated";

grant update on table "public"."project" to "authenticated";

grant delete on table "public"."project" to "service_role";

grant insert on table "public"."project" to "service_role";

grant references on table "public"."project" to "service_role";

grant select on table "public"."project" to "service_role";

grant trigger on table "public"."project" to "service_role";

grant truncate on table "public"."project" to "service_role";

grant update on table "public"."project" to "service_role";


