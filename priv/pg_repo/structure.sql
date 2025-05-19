--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg120+1)
-- Dumped by pg_dump version 17.5 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: electric_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.electric_counts (
    elec_counter integer DEFAULT 20 NOT NULL,
    id character varying(255) DEFAULT 'elec'::character varying NOT NULL
);

ALTER TABLE ONLY public.electric_counts REPLICA IDENTITY FULL;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: electric_counts electric_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.electric_counts
    ADD CONSTRAINT electric_counts_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: elect_id_key_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX elect_id_key_unique ON public.electric_counts USING btree (id);


--
-- Name: electric_publication_default; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION electric_publication_default WITH (publish = 'insert, update, delete, truncate');


--
-- Name: electric_publication_default electric_counts; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.electric_counts WHERE (((id)::text = 'elec'::text));


--
-- PostgreSQL database dump complete
--

INSERT INTO public."schema_migrations" (version) VALUES (20250516014259);
