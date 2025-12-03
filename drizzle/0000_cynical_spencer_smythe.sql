CREATE TABLE "magic_link_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "magic_link_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "retailer_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"return_window_days" integer NOT NULL,
	"website_url" text,
	"return_portal_url" text,
	"has_free_returns" boolean DEFAULT false NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"retailer_id" uuid NOT NULL,
	"name" text,
	"price" numeric(10, 2),
	"original_currency" text DEFAULT 'USD' NOT NULL,
	"price_usd" numeric(10, 2),
	"currency_symbol" text DEFAULT '$' NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"return_deadline" timestamp NOT NULL,
	"is_returned" boolean DEFAULT false NOT NULL,
	"is_kept" boolean DEFAULT false NOT NULL,
	"returned_date" timestamp,
	"kept_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"anonymous_user_id" text,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferred_currency" text DEFAULT 'USD' NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"email_notifications_enabled" boolean DEFAULT true NOT NULL,
	"push_notifications_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"name" text,
	"apple_user_id" text,
	"google_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_apple_user_id_unique" UNIQUE("apple_user_id"),
	CONSTRAINT "users_google_user_id_unique" UNIQUE("google_user_id")
);
--> statement-breakpoint
ALTER TABLE "retailer_policies" ADD CONSTRAINT "retailer_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_retailer_id_retailer_policies_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailer_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "magic_token_idx" ON "magic_link_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "magic_email_idx" ON "magic_link_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "retailer_name_idx" ON "retailer_policies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "return_items_user_id_idx" ON "return_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "return_items_retailer_id_idx" ON "return_items" USING btree ("retailer_id");--> statement-breakpoint
CREATE INDEX "return_deadline_idx" ON "return_items" USING btree ("return_deadline");--> statement-breakpoint
CREATE INDEX "is_returned_idx" ON "return_items" USING btree ("is_returned");--> statement-breakpoint
CREATE INDEX "token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "anonymous_user_id_idx" ON "sessions" USING btree ("anonymous_user_id");--> statement-breakpoint
CREATE INDEX "settings_user_id_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "apple_user_id_idx" ON "users" USING btree ("apple_user_id");--> statement-breakpoint
CREATE INDEX "google_user_id_idx" ON "users" USING btree ("google_user_id");