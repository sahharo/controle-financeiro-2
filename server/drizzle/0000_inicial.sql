CREATE TABLE "cartoes" (
	"id" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"nome" text NOT NULL,
	"dia_fechamento" integer NOT NULL,
	"dia_vencimento" integer NOT NULL,
	"limite" bigint NOT NULL,
	CONSTRAINT "cartoes_usuario_id_id_pk" PRIMARY KEY("usuario_id","id")
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"nome" text NOT NULL,
	"limite" bigint NOT NULL,
	CONSTRAINT "categorias_usuario_id_id_pk" PRIMARY KEY("usuario_id","id")
);
--> statement-breakpoint
CREATE TABLE "fixos" (
	"id" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"valor" bigint NOT NULL,
	"dia" integer NOT NULL,
	"mes_anual" integer,
	"lembrete" boolean NOT NULL,
	"pagamentos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "fixos_usuario_id_id_pk" PRIMARY KEY("usuario_id","id")
);
--> statement-breakpoint
CREATE TABLE "gastos" (
	"id" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"descricao" text NOT NULL,
	"valor" bigint NOT NULL,
	"categoria_id" text NOT NULL,
	"pagamento" jsonb NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"parcelas" integer NOT NULL,
	CONSTRAINT "gastos_usuario_id_id_pk" PRIMARY KEY("usuario_id","id")
);
--> statement-breakpoint
CREATE TABLE "metas" (
	"id" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"nome" text NOT NULL,
	"alvo" bigint NOT NULL,
	"aporte_mensal" bigint NOT NULL,
	"depositos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criada_em" timestamp with time zone NOT NULL,
	"concluida_em" timestamp with time zone,
	CONSTRAINT "metas_usuario_id_id_pk" PRIMARY KEY("usuario_id","id")
);
--> statement-breakpoint
CREATE TABLE "movimentos" (
	"id" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"conta" text NOT NULL,
	"tipo" text NOT NULL,
	"valor" bigint NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"nota" text,
	CONSTRAINT "movimentos_usuario_id_id_pk" PRIMARY KEY("usuario_id","id")
);
--> statement-breakpoint
CREATE TABLE "perfis" (
	"usuario_id" integer PRIMARY KEY NOT NULL,
	"onboarding_concluido" boolean DEFAULT false NOT NULL,
	"renda" jsonb NOT NULL,
	"preferencias" jsonb NOT NULL,
	"caixinha" jsonb NOT NULL,
	"reserva" jsonb NOT NULL,
	"ajustes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prejuizos_resolvidos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"aprendidas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"desistencias" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conquistas_datas" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receitas" (
	"id" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"descricao" text NOT NULL,
	"valor" bigint NOT NULL,
	"data" timestamp with time zone NOT NULL,
	CONSTRAINT "receitas_usuario_id_id_pk" PRIMARY KEY("usuario_id","id")
);
--> statement-breakpoint
CREATE TABLE "redefinicoes_senha" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"user_agent" text,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxas" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"sobrenome" text NOT NULL,
	"cpf" text NOT NULL,
	"celular" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cartoes" ADD CONSTRAINT "cartoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixos" ADD CONSTRAINT "fixos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metas" ADD CONSTRAINT "metas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis" ADD CONSTRAINT "perfis_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redefinicoes_senha" ADD CONSTRAINT "redefinicoes_senha_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gastos_data_idx" ON "gastos" USING btree ("usuario_id","data");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_idx" ON "sessoes" USING btree ("usuario_id");