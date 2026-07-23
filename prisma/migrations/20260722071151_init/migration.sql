-- CreateTable
CREATE TABLE "config_revisions" (
    "id" TEXT NOT NULL,
    "version_tag" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_items" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sub_category" TEXT,
    "base_score" INTEGER NOT NULL,
    "rarity" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "image_url" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gear_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_weight_configs" (
    "id" TEXT NOT NULL,
    "weapon_weight" DOUBLE PRECISION NOT NULL,
    "helmet_weight" DOUBLE PRECISION NOT NULL,
    "armor_weight" DOUBLE PRECISION NOT NULL,
    "operator_weight" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_weight_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draw_records" (
    "id" TEXT NOT NULL,
    "anonymous_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "config_version" TEXT NOT NULL,
    "weapon_item" JSONB NOT NULL,
    "helmet_item" JSONB NOT NULL,
    "armor_item" JSONB NOT NULL,
    "operator_item" JSONB NOT NULL,
    "weapon_score" INTEGER NOT NULL,
    "helmet_score" INTEGER NOT NULL,
    "armor_score" INTEGER NOT NULL,
    "operator_score" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,
    "selected_min_score" INTEGER,
    "selected_max_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draw_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "anonymous_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "properties" JSONB,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metric_summaries" (
    "date" DATE NOT NULL,
    "pv" INTEGER NOT NULL,
    "uv" INTEGER NOT NULL,
    "draw_count" INTEGER NOT NULL,
    "new_visitor_count" INTEGER NOT NULL,
    "returning_visitor_count" INTEGER NOT NULL,
    "d1_retained_count" INTEGER NOT NULL,

    CONSTRAINT "daily_metric_summaries_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "gear_items_category_enabled_idx" ON "gear_items"("category", "enabled");

-- CreateIndex
CREATE INDEX "draw_records_anonymous_id_created_at_idx" ON "draw_records"("anonymous_id", "created_at");

-- CreateIndex
CREATE INDEX "draw_records_created_at_idx" ON "draw_records"("created_at");

-- CreateIndex
CREATE INDEX "analytics_events_anonymous_id_created_at_idx" ON "analytics_events"("anonymous_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_event_name_created_at_idx" ON "analytics_events"("event_name", "created_at");
