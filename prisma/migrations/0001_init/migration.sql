-- Create enums
CREATE TYPE "PaidStatus" AS ENUM ('pending', 'paid', 'void');
CREATE TYPE "LiveStatus" AS ENUM ('active', 'mc', 'wd', 'dq', 'ns');

CREATE TABLE "pools" (
  "id" TEXT PRIMARY KEY,
  "year" INTEGER NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "lock_at_ct" TIMESTAMP(3) NOT NULL,
  "entry_fee_cents" INTEGER NOT NULL,
  "venmo_handle" TEXT NOT NULL,
  "masters_parent_id" TEXT,
  "masters_tournament_id" TEXT,
  "winner_final_score_to_par" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "tiers" (
  "id" TEXT PRIMARY KEY,
  "pool_id" TEXT NOT NULL,
  "tier_num" INTEGER NOT NULL,
  "label" TEXT,
  CONSTRAINT "tiers_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE,
  CONSTRAINT "tiers_pool_tier_unique" UNIQUE ("pool_id", "tier_num")
);

CREATE TABLE "golfers" (
  "id" TEXT PRIMARY KEY,
  "api_player_id" TEXT NOT NULL UNIQUE,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "country" TEXT
);

CREATE TABLE "tier_golfers" (
  "id" TEXT PRIMARY KEY,
  "tier_id" TEXT NOT NULL,
  "golfer_id" TEXT NOT NULL,
  CONSTRAINT "tier_golfers_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE CASCADE,
  CONSTRAINT "tier_golfers_golfer_id_fkey" FOREIGN KEY ("golfer_id") REFERENCES "golfers"("id") ON DELETE CASCADE,
  CONSTRAINT "tier_golfers_unique" UNIQUE ("tier_id", "golfer_id")
);

CREATE TABLE "entries" (
  "id" TEXT PRIMARY KEY,
  "pool_id" TEXT NOT NULL,
  "purchaser_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "team_name" TEXT NOT NULL,
  "tiebreak_winner_score" INTEGER NOT NULL,
  "paid_status" "PaidStatus" NOT NULL DEFAULT 'pending',
  "paid_at" TIMESTAMP(3),
  "is_dead" BOOLEAN NOT NULL DEFAULT false,
  "dead_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entries_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE
);

CREATE TABLE "picks" (
  "id" TEXT PRIMARY KEY,
  "entry_id" TEXT NOT NULL,
  "tier_num" INTEGER NOT NULL,
  "golfer_id" TEXT NOT NULL,
  CONSTRAINT "picks_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE,
  CONSTRAINT "picks_golfer_id_fkey" FOREIGN KEY ("golfer_id") REFERENCES "golfers"("id"),
  CONSTRAINT "picks_unique" UNIQUE ("entry_id", "tier_num")
);

CREATE TABLE "substitutions" (
  "id" TEXT PRIMARY KEY,
  "entry_id" TEXT NOT NULL,
  "tier_num" INTEGER NOT NULL,
  "from_golfer_id" TEXT NOT NULL,
  "to_golfer_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "substitutions_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE
);

CREATE TABLE "live_scores" (
  "id" TEXT PRIMARY KEY,
  "pool_id" TEXT NOT NULL,
  "golfer_id" TEXT NOT NULL,
  "status" "LiveStatus" NOT NULL,
  "to_par" INTEGER,
  "round_to_par_1" INTEGER,
  "round_to_par_2" INTEGER,
  "round_to_par_3" INTEGER,
  "round_to_par_4" INTEGER,
  "thru" INTEGER,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_scores_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE,
  CONSTRAINT "live_scores_golfer_id_fkey" FOREIGN KEY ("golfer_id") REFERENCES "golfers"("id") ON DELETE CASCADE,
  CONSTRAINT "live_scores_unique" UNIQUE ("pool_id", "golfer_id")
);

CREATE TABLE "leaderboard_cache" (
  "id" TEXT PRIMARY KEY,
  "pool_id" TEXT NOT NULL,
  "entry_id" TEXT NOT NULL,
  "total_to_par" INTEGER NOT NULL,
  "tier6_to_par" INTEGER NOT NULL,
  "tier3_to_par" INTEGER NOT NULL,
  "tier4_to_par" INTEGER NOT NULL,
  "rank" INTEGER,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leaderboard_cache_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE,
  CONSTRAINT "leaderboard_cache_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE,
  CONSTRAINT "leaderboard_cache_unique" UNIQUE ("pool_id", "entry_id")
);
