CREATE TABLE IF NOT EXISTS public.audit_logs
(
    id integer NOT NULL DEFAULT nextval('audit_logs_id_seq'::regclass),
    user_id integer,
    action character varying COLLATE pg_catalog."default",
    url character varying COLLATE pg_catalog."default",
    method character varying COLLATE pg_catalog."default",
    new_data character varying COLLATE pg_catalog."default",
    "timestamp" timestamp with time zone,
    old_data character varying COLLATE pg_catalog."default",
    organization_id uuid,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.organizations
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying COLLATE pg_catalog."default",
    subdomain character varying COLLATE pg_catalog."default",
    settings json,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT organizations2_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_organizations
(
    id integer NOT NULL DEFAULT nextval('user_organizations_id_seq'::regclass),
    user_id integer,
    organization_id uuid,
    role character varying COLLATE pg_catalog."default",
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_organizations2_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    email character varying COLLATE pg_catalog."default",
    name character varying COLLATE pg_catalog."default",
    sub character varying COLLATE pg_catalog."default",
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);
