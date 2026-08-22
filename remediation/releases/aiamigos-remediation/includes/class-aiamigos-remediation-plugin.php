<?php
/**
 * WordPress integration for the reversible AI Amigos remediation layer.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'AIAmigos_Remediation_Plugin', false ) ) {
	final class AIAmigos_Remediation_Plugin {
		/** @var bool */
		private static $booted = false;

		/** @var bool */
		private static $front_intro_rendered = false;

		/** @var bool */
		private static $blog_heading_rendered = false;

		/** @var array<int,bool> */
		private static $byline_rendered = array();

		/** @var array<int,bool> */
		private static $meta_description_seen = array();

		/** @var array<int,bool> */
		private static $facebook_description_seen = array();

		/** @var array<int,bool> */
		private static $twitter_description_seen = array();

		/**
		 * Register hooks once.
		 *
		 * @return void
		 */
		public static function boot() {
			if ( self::$booted ) {
				return;
			}
			self::$booted = true;

			add_filter( 'document_title_parts', array( __CLASS__, 'filter_blog_document_title' ) );
			add_filter( 'document_title_parts', array( __CLASS__, 'filter_exact_document_title' ), 20 );
			add_filter( 'rank_math/frontend/title', array( __CLASS__, 'filter_blog_seo_title' ) );
			add_filter( 'rank_math/frontend/title', array( __CLASS__, 'filter_exact_seo_title' ), 20 );
			add_filter( 'rank_math/frontend/description', array( __CLASS__, 'filter_meta_description' ), 20 );
			add_filter( 'rank_math/opengraph/facebook/og_description', array( __CLASS__, 'filter_social_description' ), 20 );
			add_filter( 'rank_math/opengraph/twitter/twitter_description', array( __CLASS__, 'filter_social_description' ), 20 );
			add_filter( 'wpseo_title', array( __CLASS__, 'filter_blog_seo_title' ) );
			add_filter( 'wpseo_title', array( __CLASS__, 'filter_exact_seo_title' ), 20 );
			add_filter( 'wpseo_metadesc', array( __CLASS__, 'filter_meta_description' ), 20 );
			add_filter( 'wpseo_opengraph_desc', array( __CLASS__, 'filter_social_description' ), 20 );
			add_filter( 'wpseo_twitter_description', array( __CLASS__, 'filter_social_description' ), 20 );
			add_filter( 'rank_math/frontend/canonical', array( __CLASS__, 'filter_blog_canonical' ) );
			add_filter( 'wpseo_canonical', array( __CLASS__, 'filter_blog_canonical' ) );
			add_filter( 'rank_math/opengraph/facebook/image', array( __CLASS__, 'filter_social_image' ), 99 );
			add_filter( 'rank_math/opengraph/twitter/image', array( __CLASS__, 'filter_social_image' ), 99 );
			add_filter( 'rank_math/json_ld', array( __CLASS__, 'filter_unverified_schema' ), 99, 2 );

			add_action( 'template_redirect', array( __CLASS__, 'apply_route_policy' ), 0 );
			add_action( 'wp', array( __CLASS__, 'disable_unreviewed_site_kit_tags' ), 99 );
			add_filter( 'allowed_redirect_hosts', array( __CLASS__, 'allow_canonical_redirect_host' ) );
			add_action( 'pre_get_posts', array( __CLASS__, 'exclude_quarantined_records_from_queries' ), 99 );
			add_filter( 'rank_math/sitemap/entry', array( __CLASS__, 'filter_rank_math_sitemap_entry' ), 99, 3 );
			add_filter( 'rank_math/sitemap/exclude_taxonomy', array( __CLASS__, 'exclude_category_from_rank_math_sitemap' ), 99, 2 );
			add_filter( 'wp_sitemaps_posts_query_args', array( __CLASS__, 'filter_core_sitemap_query_args' ), 99, 2 );
			add_filter( 'wp_sitemaps_taxonomies', array( __CLASS__, 'exclude_category_from_core_sitemap' ), 99 );
			add_filter( 'wpseo_exclude_from_sitemap_by_post_ids', array( __CLASS__, 'filter_yoast_sitemap_post_ids' ), 99 );

			add_filter( 'wp_robots', array( __CLASS__, 'filter_wp_robots' ), 99 );
			add_filter( 'rank_math/frontend/robots', array( __CLASS__, 'filter_rank_math_robots' ), 99 );
			add_filter( 'wpseo_robots', array( __CLASS__, 'filter_robots_string' ), 99 );
			add_filter( 'wp_headers', array( __CLASS__, 'filter_response_headers' ), 99 );
			add_action( 'send_headers', array( __CLASS__, 'remove_runtime_disclosure_header' ), 99 );

			add_filter( 'nav_menu_link_attributes', array( __CLASS__, 'normalize_menu_link' ), 99, 4 );
			add_filter( 'script_loader_tag', array( __CLASS__, 'make_wp_dependencies_blocking' ), PHP_INT_MAX, 3 );
			add_filter( 'wp_resource_hints', array( __CLASS__, 'filter_disabled_service_resource_hints' ), 99, 2 );
			add_filter( 'gettext', array( __CLASS__, 'correct_exact_ui_strings' ), 20, 3 );
			add_action( 'after_setup_theme', array( __CLASS__, 'register_theme_mod_option_filter' ), 99 );

			remove_action( 'wp_head', 'wp_generator' );
			add_filter( 'the_generator', '__return_empty_string', 99 );
			add_action( 'wp_head', array( __CLASS__, 'render_site_icon_fallback' ), 98 );
			add_action( 'wp_head', array( __CLASS__, 'render_exact_description_fallback' ), 99 );

			// Run before core do_shortcode (priority 11) so MailPoet never sees the
			// malformed token and the CF7 replacement owns the request path.
			add_filter( 'widget_text', array( __CLASS__, 'replace_mailpoet_form' ), 8 );
			add_filter( 'widget_text_content', array( __CLASS__, 'replace_mailpoet_form' ), 8 );
			add_filter( 'widget_text', array( __CLASS__, 'repair_known_output_links' ), 19 );
			add_filter( 'widget_text_content', array( __CLASS__, 'repair_known_output_links' ), 19 );
			add_filter( 'the_content', array( __CLASS__, 'render_bounded_institutional_page' ), 7 );
			add_filter( 'the_content', array( __CLASS__, 'replace_mailpoet_form' ), 8 );
			add_filter( 'the_content', array( __CLASS__, 'repair_editor_content' ), 8 );
			add_filter( 'the_content', array( __CLASS__, 'prepend_accountable_byline' ), 9 );
			add_filter( 'widget_title', array( __CLASS__, 'label_update_request_widget' ), 20, 3 );
			add_filter( 'dynamic_sidebar_params', array( __CLASS__, 'normalize_widget_heading_level' ), 99 );

			add_filter( 'theme_mod_vw_sirat_pro_header_section_call2', array( __CLASS__, 'filter_theme_phone_mod' ) );
			add_filter( 'theme_mod_vw_sirat_pro_header_section_email', array( __CLASS__, 'filter_theme_email_mod' ) );
			add_filter( 'theme_mod_vw_sirat_pro_footer_copy', array( __CLASS__, 'filter_footer_copy_mod' ) );
			add_filter( 'theme_mod_vw_sirat_pro_hide_show_credit_link', array( __CLASS__, 'hide_theme_credit_mod' ) );
			add_filter( 'theme_mod_vw_sirat_pro_our_services_enable', array( __CLASS__, 'disable_unverified_services_section' ) );
			add_filter( 'theme_mod_vw_sirat_pro_footer_widgets_enable', array( __CLASS__, 'disable_unreviewed_footer_widgets' ) );

			add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_inline_styles' ), 99 );
			add_action( 'wp_enqueue_scripts', array( __CLASS__, 'dequeue_nonessential_frontend_assets' ), 999 );
			add_action( 'vw_sirat_pro_after_section_slider', array( __CLASS__, 'render_front_page_intro' ), 10 );
			add_action( 'loop_start', array( __CLASS__, 'render_blog_archive_heading' ), 1 );

			add_filter( 'post_thumbnail_size', array( __CLASS__, 'filter_listing_thumbnail_size' ), 99, 2 );
		}

		/**
		 * Flush route and supported sitemap caches after a controlled activation.
		 *
		 * @return void
		 */
		public static function activate() {
			flush_rewrite_rules( false );
			if ( class_exists( '\\RankMath\\Sitemap\\Cache' ) && is_callable( array( '\\RankMath\\Sitemap\\Cache', 'invalidate_storage' ) ) ) {
				\RankMath\Sitemap\Cache::invalidate_storage();
			}
			if ( class_exists( 'WPSEO_Sitemaps_Cache' ) && is_callable( array( 'WPSEO_Sitemaps_Cache', 'clear' ) ) ) {
				WPSEO_Sitemaps_Cache::clear();
			}
		}

		/**
		 * Whether this is a public front-end request suitable for mutations.
		 *
		 * @return bool
		 */
		private static function is_frontend_request() {
			if ( is_admin() ) {
				return false;
			}
			if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
				return false;
			}
			if ( function_exists( 'wp_doing_cron' ) && wp_doing_cron() ) {
				return false;
			}
			if ( defined( 'WP_CLI' ) && WP_CLI ) {
				return false;
			}
			if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
				return false;
			}
			if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) {
				return false;
			}

			$request_path = AIAmigos_Remediation_Policy::normalize_path( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/' );
			if ( 0 === strpos( $request_path, '/wp-json/' ) ) {
				return false;
			}

			return true;
		}

		/**
		 * Canonical base URL. Production is forced to www/HTTPS while non-production
		 * hosts remain on their own HTTPS origin unless explicitly filtered.
		 *
		 * @return string
		 */
		private static function canonical_base_url() {
			$home = home_url( '/' );
			$host = wp_parse_url( $home, PHP_URL_HOST );
			if ( $host && 'aiamigos.org' === strtolower( preg_replace( '/^www\./i', '', $host ) ) ) {
				$default = 'https://www.aiamigos.org/';
			} else {
				$default = set_url_scheme( $home, 'https' );
			}
			$base = apply_filters( 'aiamigos_remediation_canonical_base_url', $default );
			$base = esc_url_raw( (string) $base );
			return $base ? trailingslashit( $base ) : trailingslashit( $default );
		}

		/**
		 * Filterable canonical blog base path.
		 *
		 * @return string
		 */
		private static function blog_base_path() {
			$base = (string) apply_filters( 'aiamigos_remediation_blog_base_path', '/blog/' );
			return AIAmigos_Remediation_Policy::normalize_path( $base );
		}

		/**
		 * Exact canonical redirects.
		 *
		 * @return array
		 */
		private static function redirect_paths() {
			$paths = array(
				'/home/'         => '/',
				'/newsletter-2/' => '/newsletter/',
			);
			$paths = apply_filters( 'aiamigos_remediation_redirect_paths', $paths );
			return is_array( $paths ) ? $paths : array();
		}

		/**
		 * Exact public demo and retired custom-service paths that must return 410.
		 *
		 * @return array
		 */
		private static function gone_paths() {
			$paths = array(
				'/classes/recent-case-title-01/',
				'/classes/recent-case-title-02/',
				'/testimonials/client-name-01/',
				'/testimonials/client-name-02/',
				'/testimonials/client-name-03/',
				'/team/member-name-02/',
				'/team/member-name-03/',
				'/team/member-name-04/',
				'/services/ai-amigos-academy/',
				'/services/ai-amigos-pro/',
				'/services/ai-by-job-role/',
				'/services/ai-for-kids/',
			);
			$paths = apply_filters( 'aiamigos_remediation_gone_paths', $paths );
			return is_array( $paths ) ? $paths : array();
		}

		/**
		 * Seeded theme-demo and retired custom-service records retained only for
		 * recoverable admin access.
		 *
		 * ID 38 is the genuine Vijay team record and is deliberately absent.
		 *
		 * @return array
		 */
		private static function quarantined_post_ids() {
			$ids = array( 34, 36, 46, 48, 50, 40, 42, 44, 26, 28, 30, 32 );
			$ids = apply_filters( 'aiamigos_remediation_quarantined_post_ids', $ids );
			return AIAmigos_Remediation_Policy::merge_positive_ids( array(), is_array( $ids ) ? $ids : array() );
		}

		/**
		 * Published factual records that must never appear in a sitemap while noindex.
		 *
		 * @return array
		 */
		private static function high_risk_post_ids() {
			$ids = array( 945, 441, 783, 1405, 292, 24, 158, 941 );
			$ids = apply_filters( 'aiamigos_remediation_high_risk_post_ids', $ids );
			return AIAmigos_Remediation_Policy::merge_positive_ids( array(), is_array( $ids ) ? $ids : array() );
		}

		/**
		 * All records suppressed from XML sitemaps.
		 *
		 * @return array
		 */
		private static function sitemap_excluded_post_ids() {
			return AIAmigos_Remediation_Policy::merge_positive_ids( self::quarantined_post_ids(), self::high_risk_post_ids() );
		}

		/**
		 * Keep seeded demo records out of every non-admin front-end WP_Query.
		 *
		 * @param WP_Query $query Query about to run.
		 * @return void
		 */
		public static function exclude_quarantined_records_from_queries( $query ) {
			if ( ! self::is_frontend_request() || ! is_object( $query ) || ! method_exists( $query, 'get' ) || ! method_exists( $query, 'set' ) ) {
				return;
			}
			$post_types           = (array) $query->get( 'post_type' );
			$infrastructure_types = array( 'attachment', 'revision', 'nav_menu_item', 'wpcf7_contact_form' );
			if ( array_intersect( $post_types, $infrastructure_types ) ) {
				return;
			}

			$quarantined = self::quarantined_post_ids();
			$post_in     = $query->get( 'post__in' );
			if ( is_array( $post_in ) && ! empty( $post_in ) ) {
				$allowed = array_values( array_diff( AIAmigos_Remediation_Policy::merge_positive_ids( array(), $post_in ), $quarantined ) );
				// WP_Query treats an empty post__in as unrestricted, so force an
				// impossible ID when the original allowlist contained only demo IDs.
				$query->set( 'post__in', empty( $allowed ) ? array( 0 ) : $allowed );
				return;
			}

			$existing = $query->get( 'post__not_in' );
			$query->set( 'post__not_in', AIAmigos_Remediation_Policy::merge_positive_ids( $existing, $quarantined ) );
		}

		/**
		 * Remove seeded demo records from Rank Math XML sitemap output.
		 *
		 * @param array|false $url    Sitemap URL entry.
		 * @param string      $type   Entry type: post, term, or user.
		 * @param object      $object Source object.
		 * @return array|false
		 */
		public static function filter_rank_math_sitemap_entry( $url, $type, $object ) {
			$post_id = ( 'post' === $type && is_object( $object ) && isset( $object->ID ) ) ? (int) $object->ID : 0;
			return $post_id && in_array( $post_id, self::sitemap_excluded_post_ids(), true ) ? false : $url;
		}

		/**
		 * Exclude the undifferentiated category taxonomy from Rank Math XML sitemaps.
		 *
		 * This uses Rank Math's documented taxonomy-level contract and preserves any
		 * exclusion decision already made by another integration.
		 *
		 * @param bool   $exclude  Existing exclusion decision.
		 * @param string $taxonomy Taxonomy name.
		 * @return bool
		 */
		public static function exclude_category_from_rank_math_sitemap( $exclude, $taxonomy ) {
			return $exclude || 'category' === (string) $taxonomy;
		}

		/**
		 * Apply the same quarantine to WordPress core post sitemaps.
		 *
		 * @param array  $args      WP_Query arguments.
		 * @param string $post_type Post type being indexed.
		 * @return array
		 */
		public static function filter_core_sitemap_query_args( $args, $post_type ) {
			if ( ! is_array( $args ) ) {
				$args = array();
			}
			$existing             = isset( $args['post__not_in'] ) ? $args['post__not_in'] : array();
			$args['post__not_in'] = AIAmigos_Remediation_Policy::merge_positive_ids( $existing, self::sitemap_excluded_post_ids() );
			return $args;
		}

		/**
		 * Remove category from the registered WordPress core taxonomy providers.
		 *
		 * @param array $taxonomies Public taxonomy objects keyed by taxonomy name.
		 * @return array
		 */
		public static function exclude_category_from_core_sitemap( $taxonomies ) {
			if ( ! is_array( $taxonomies ) ) {
				return array();
			}
			unset( $taxonomies['category'] );
			return $taxonomies;
		}

		/**
		 * Apply the same exact exclusions to Yoast post sitemaps when installed.
		 *
		 * @param array $post_ids Existing excluded IDs.
		 * @return array
		 */
		public static function filter_yoast_sitemap_post_ids( $post_ids ) {
			return AIAmigos_Remediation_Policy::merge_positive_ids( $post_ids, self::sitemap_excluded_post_ids() );
		}

		/**
		 * Exact factual pages that remain published but are temporarily noindex.
		 *
		 * @return array
		 */
		private static function high_risk_noindex_paths() {
			$paths = array(
				'/ai-certifications/',
				'/gpt-models/',
				'/grokai/',
				'/ai-model-benchmarks-a-comprehensive-guide/',
				'/privacy-policy-2/',
				'/page/',
				'/academy/',
				'/ai-career/',
			);
			$paths = apply_filters( 'aiamigos_remediation_high_risk_noindex_paths', $paths );
			return is_array( $paths ) ? $paths : array();
		}

		/**
		 * Whether the current native request is the canonical blog route.
		 *
		 * @return bool
		 */
		private static function is_blog_archive_request() {
			if ( ! is_home() ) {
				return false;
			}
			$path = AIAmigos_Remediation_Policy::normalize_path( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/' );
			$blog = preg_quote( trim( self::blog_base_path(), '/' ), '#' );
			return (bool) preg_match( '#^/' . $blog . '(?:/page/(?:[2-9]|[1-9][0-9]+))?/$#i', $path );
		}

		/**
		 * Give canonical archive pages differentiated browser titles.
		 *
		 * @param array $parts Document-title parts.
		 * @return array
		 */
		public static function filter_blog_document_title( $parts ) {
			if ( self::is_blog_archive_request() ) {
				$paged          = max( 1, (int) get_query_var( 'paged' ) );
				$parts['title'] = 1 < $paged ? sprintf( __( 'AI Amigos Blog - Page %d', 'aiamigos-remediation' ), $paged ) : __( 'AI Amigos Blog', 'aiamigos-remediation' );
			}
			return $parts;
		}

		/**
		 * Give Rank Math and Yoast the same differentiated native blog title.
		 *
		 * @param string $title Existing SEO title.
		 * @return string
		 */
		public static function filter_blog_seo_title( $title ) {
			if ( ! self::is_blog_archive_request() ) {
				return $title;
			}
			$paged = max( 1, (int) get_query_var( 'paged' ) );
			return 1 < $paged ? sprintf( __( 'AI Amigos Blog - Page %d', 'aiamigos-remediation' ), $paged ) : __( 'AI Amigos Blog', 'aiamigos-remediation' );
		}

		/**
		 * Exact, evidence-bounded title replacements for all 38 long titles in the
		 * captured 114-URL production inventory, plus six short hub titles found
		 * by the post-quarantine staging crawl. Some records are now draft, but
		 * retaining their mapping prevents a known-bad title from returning if an
		 * editor later restores the record without completing its review gate.
		 *
		 * @return array<string,string>
		 */
		private static function exact_title_overrides() {
			return array(
				'academy'                                                                     => 'AI Learning Resources | AI Amigos',
				'ai-career'                                                                   => 'AI Career Paths | AI Amigos',
				'about-us'                                                                    => 'About AI Amigos',
				'contact'                                                                     => 'Contact AI Amigos',
				'faq'                                                                         => 'AI Amigos Frequently Asked Questions',
				'page'                                                                        => 'AI Amigos Mission and Editorial Scope',
				'ai-app-development'                                                          => 'Building an AI App with Prompt-Based Tools',
				'artificial-intelligence-ai'                                                  => 'Artificial Intelligence: Concepts, Uses and Limits',
				'latest-blog-title-01'                                                        => 'How Artificial Intelligence Shapes Everyday Systems',
				'ai-in-healthcare'                                                            => 'AI in Healthcare: Uses, Risks and Evidence',
				'ai-in-finance'                                                               => 'AI in Finance: Uses, Risks and Governance',
				'unboxing-ai-the-retail-revolution-behind-your-shopping-spree'                 => 'AI in Retail: Common Uses and Trade-Offs',
				'the-blog-publishing-checklist-ensuring-your-content-doesnt-go-oops'           => 'A Practical Blog Publishing Checklist',
				'ai-rule-based-systems'                                                        => 'AI Rule-Based Systems: Concepts and Limits',
				'machine-learning'                                                             => 'Machine Learning: Concepts, Uses and Limits',
				'deep-learning-ai'                                                             => 'Deep Learning: Concepts, Uses and Limits',
				'superintelligent-ai'                                                          => 'Superintelligent AI: Concepts and Open Questions',
				'self-aware-ai'                                                                => 'Self-Aware AI: Claims and Open Questions',
				'co-evolving-ai'                                                               => 'Human-AI Coevolution: Concepts and Questions',
				'quantum-ai'                                                                   => 'Quantum AI: Current Research and Open Questions',
				'gpt-models'                                                                   => 'GPT Model History: A Sourced Overview',
				'ais-dawn-revolutionizing-the-digital-realm'                                   => 'AI in Everyday Digital Systems: An Overview',
				'large-language-model'                                                          => 'Large Language Models: Uses, Limits and Risks',
				'grokai'                                                                       => 'Grok AI Product Identity: A Sourced Review',
				'prompt-design-and-engineering'                                                 => 'Prompt Design and Engineering: A Practical Overview',
				'building-agentic-ai-saas-a-strategic-roadmap-using-google-gemini-enterprise' => 'Building Agentic AI SaaS with Google Gemini',
				'langgraph-5-stunning-secrets-for-building-a-generative-ai-application'       => 'Building Stateful AI Workflows with LangGraph',
				'ways-to-test-a-rag-architecture-based-generative-ai-application'            => 'Testing a Retrieval-Augmented Generation Application',
				'rag-architecture-types-with-implementation-details-and-their-use-cases'      => 'RAG Architecture Types and Use Cases',
				'tesseract-an-ocr-optical-character-recognition-tool-for-image-reading-from-excel' => 'Extract Text from Excel Images with Tesseract OCR',
				'fine-tuning-your-generative-ai-application-a-comprehensive-guide-to-parameters-and-configurations' => 'Generative AI Tuning Parameters: A Practical Guide',
				'a-comprehensive-guide-to-nvidia-monai-unlocking-ai-in-medical-imaging'       => 'NVIDIA MONAI for Medical Imaging: An Overview',
				'choosing-the-right-vector-database-with-caching-a-comprehensive-guide-for-genai-applications' => 'Choosing a Vector Database and Caching Strategy',
				'nvidias-chat-with-rtx-the-key-to-next-generation-chatbots-on-your-pc'        => 'NVIDIA Chat with RTX: Local Chatbot Overview',
				'ai-evolution'                                                                => 'A Brief History of Artificial Intelligence Approaches',
				'building-features-faster-and-better-with-ai'                                  => 'Building Software Features with AI Assistance',
				'how-ai-is-transforming-software-engineering'                                  => 'AI in Software Engineering: Uses and Limits',
				'local-llm-on-your-laptop'                                                     => 'Running a Local LLM with Ollama: An Overview',
				'custom-gpt-models'                                                            => 'Creating Custom GPTs: An Introductory Guide',
				'prompt-engineering'                                                           => 'Prompt Engineering: Methods, Testing and Limits',
				'generative-ai-solutions'                                                      => 'Generative AI Solutions: Uses and Trade-Offs',
				'ai-and-robotics'                                                              => 'AI and Robotics in Manufacturing: An Overview',
				'decentralized-ai'                                                             => 'Decentralized AI: Concepts, Uses and Risks',
				'general-ai'                                                                   => 'Artificial General Intelligence: Concepts and Questions',
			);
		}

		/**
		 * Current singular slug without trusting request casing.
		 *
		 * @return string
		 */
		private static function current_singular_slug() {
			if ( ! self::is_frontend_request() || ! is_singular() ) {
				return '';
			}
			$post_id = (int) get_queried_object_id();
			return $post_id ? sanitize_title( (string) get_post_field( 'post_name', $post_id ) ) : '';
		}

		/**
		 * Apply an exact title override to Rank Math/Yoast output.
		 *
		 * @param string $title Existing SEO title.
		 * @return string
		 */
		public static function filter_exact_seo_title( $title ) {
			$slug      = self::current_singular_slug();
			$overrides = self::exact_title_overrides();
			return $slug && isset( $overrides[ $slug ] ) ? $overrides[ $slug ] : $title;
		}

		/**
		 * Keep the browser document title aligned with the exact SEO override.
		 *
		 * @param array $parts Document title parts.
		 * @return array
		 */
		public static function filter_exact_document_title( $parts ) {
			$slug      = self::current_singular_slug();
			$overrides = self::exact_title_overrides();
			if ( $slug && isset( $overrides[ $slug ] ) ) {
				$parts['title'] = $overrides[ $slug ];
			}
			return $parts;
		}

		/**
		 * Multibyte-safe string length with a core-PHP fallback.
		 *
		 * @param string $value Text to measure.
		 * @return int
		 */
		private static function text_length( $value ) {
			return function_exists( 'mb_strlen' ) ? mb_strlen( $value, 'UTF-8' ) : strlen( $value );
		}

		/**
		 * Multibyte-safe substring with a core-PHP fallback.
		 *
		 * @param string $value  Source text.
		 * @param int    $length Maximum characters.
		 * @return string
		 */
		private static function text_substr( $value, $length ) {
			return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $length, 'UTF-8' ) : substr( $value, 0, $length );
		}

		/**
		 * Convert captured or generated copy to a plain 120-160 character excerpt.
		 *
		 * No new claim is introduced: the result is derived only from existing SEO
		 * copy or the record body and ends on a word boundary where possible.
		 *
		 * @param string $value Existing description candidate.
		 * @param string $body  Raw editor body used only when the candidate is thin.
		 * @return string
		 */
		private static function normalize_description_text( $value, $body = '' ) {
			$clean = static function ( $text ) {
				$text = strip_shortcodes( (string) $text );
				$text = html_entity_decode( wp_strip_all_tags( $text, true ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
				return trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
			};

			$text = $clean( $value );
			if ( self::text_length( $text ) < 50 ) {
				$body_text = $clean( $body );
				if ( self::text_length( $body_text ) > self::text_length( $text ) ) {
					$text = $body_text;
				}
			}
			if ( self::text_length( $text ) <= 160 ) {
				return $text;
			}

			$excerpt = rtrim( self::text_substr( $text, 157 ) );
			$bounded = preg_replace( '/\s+\S*$/u', '', $excerpt );
			if ( is_string( $bounded ) && self::text_length( trim( $bounded ) ) >= 120 ) {
				$excerpt = trim( $bounded );
			}
			$excerpt = rtrim( $excerpt, " \t\n\r\0\x0B,;:-" );
			return $excerpt . '...';
		}

		/**
		 * Supply bounded Rank Math/Yoast descriptions without changing stored fields.
		 *
		 * @param string $description Existing description.
		 * @return string
		 */
		public static function filter_meta_description( $description ) {
			if ( ! self::is_frontend_request() ) {
				return $description;
			}
			$post_id = is_singular() ? (int) get_queried_object_id() : 0;
			if ( $post_id ) {
				self::$meta_description_seen[ $post_id ] = true;
			}
			if ( is_front_page() ) {
				return 'Explore AI Amigos articles about AI concepts, tools, careers and responsible use. Check publication dates and cited sources before relying on details.';
			}
			if ( self::is_blog_archive_request() ) {
				$paged  = max( 1, (int) get_query_var( 'paged' ) );
				$suffix = 1 < $paged ? sprintf( ' This is archive page %d.', $paged ) : '';
				return 'Browse AI Amigos articles about AI concepts, tools, software development, learning and careers, ordered by publication date.' . $suffix;
			}
			if ( ! is_singular() ) {
				return $description;
			}

			$override = self::exact_description_override();
			if ( '' !== $override ) {
				return $override;
			}
			$body    = $post_id ? (string) get_post_field( 'post_content', $post_id ) : '';
			return self::normalize_description_text( $description, $body );
		}

		/**
		 * Exact descriptions for surfaces whose stored source cannot produce an
		 * honest useful excerpt. These describe only implemented, visible facts.
		 *
		 * @return string
		 */
		private static function exact_description_override() {
			$slug = self::current_singular_slug();
			$descriptions = array(
				'newsletter'       => 'Request information about future AI Amigos updates by email. This contact request does not promise automatic mailing-list subscription.',
				'member-name-01'   => 'Vijay Bhoyar is listed as the founder and editor of AI Amigos. This page describes his role and editorial responsibilities.',
				'about-us'         => 'AI Amigos publishes educational articles about artificial intelligence. Vijay Bhoyar is listed as founder and editor; corrections are welcome.',
				'contact'          => 'Contact AI Amigos about editorial corrections, content questions or update requests. Do not send confidential or sensitive personal information.',
				'privacy-policy-2' => 'Review how AI Amigos currently describes website data practices. This notice remains pending owner and legal review.',
			);
			return $slug && isset( $descriptions[ $slug ] ) ? $descriptions[ $slug ] : '';
		}

		/**
		 * Keep social descriptions aligned with the exact visible-page summary.
		 *
		 * @param string $description Existing social description.
		 * @return string
		 */
		public static function filter_social_description( $description ) {
			if ( ! self::is_frontend_request() || ! is_singular() ) {
				return $description;
			}
			$post_id = (int) get_queried_object_id();
			$hook    = current_filter();
			if ( false !== strpos( $hook, 'facebook' ) || 'wpseo_opengraph_desc' === $hook ) {
				self::$facebook_description_seen[ $post_id ] = true;
			}
			if ( false !== strpos( $hook, 'twitter' ) ) {
				self::$twitter_description_seen[ $post_id ] = true;
			}
			$override = self::exact_description_override();
			return '' !== $override ? $override : $description;
		}

		/**
		 * Emit missing exact description tags for custom post types on which the
		 * active SEO plugin does not invoke its empty-description filters.
		 * Per-tag flags prevent duplicate output when a supported SEO hook ran.
		 *
		 * @return void
		 */
		public static function render_exact_description_fallback() {
			if ( ! self::is_frontend_request() || ! is_singular() ) {
				return;
			}
			$description = self::exact_description_override();
			$post_id     = (int) get_queried_object_id();
			if ( '' === $description || ! $post_id ) {
				return;
			}
			if ( empty( self::$meta_description_seen[ $post_id ] ) ) {
				printf( "\n<meta name=\"description\" content=\"%s\" />", esc_attr( $description ) );
			}
			if ( empty( self::$facebook_description_seen[ $post_id ] ) ) {
				printf( "\n<meta property=\"og:description\" content=\"%s\" />", esc_attr( $description ) );
			}
			if ( empty( self::$twitter_description_seen[ $post_id ] ) ) {
				printf( "\n<meta name=\"twitter:description\" content=\"%s\" />", esc_attr( $description ) );
			}
			echo "\n";
		}

		/**
		 * Use the current custom logo only when Rank Math has no social image.
		 *
		 * @param string $attachment_url Existing OpenGraph image URL.
		 * @return string
		 */
		public static function filter_social_image( $attachment_url ) {
			if ( '' !== trim( (string) $attachment_url ) ) {
				return $attachment_url;
			}
			$logo_id = absint( get_theme_mod( 'custom_logo' ) );
			$logo    = $logo_id ? wp_get_attachment_image_url( $logo_id, 'full' ) : '';
			if ( ! $logo ) {
				return $attachment_url;
			}
			$https_logo = esc_url_raw( set_url_scheme( $logo, 'https' ) );
			return $https_logo ? $https_logo : $attachment_url;
		}

		/**
		 * Use the existing custom logo as a same-origin icon only when WordPress has
		 * no configured Site Icon. This prevents the browser's implicit /favicon.ico
		 * request without creating or claiming a new brand asset.
		 *
		 * @return void
		 */
		public static function render_site_icon_fallback() {
			if ( ! self::is_frontend_request() || ( function_exists( 'has_site_icon' ) && has_site_icon() ) ) {
				return;
			}
			$logo_id = absint( get_theme_mod( 'custom_logo' ) );
			$logo    = $logo_id ? wp_get_attachment_image_url( $logo_id, 'thumbnail' ) : '';
			if ( $logo ) {
				printf( "\n<link rel=\"icon\" href=\"%s\" />\n", esc_url( set_url_scheme( $logo, 'https' ) ) );
			}
		}

		/**
		 * Fail closed on unverified homepage entities and normalize same-site HTTP
		 * references. The homepage still retains Rank Math's WebSite and WebPage
		 * nodes; unsupported organization, person, and article assertions are
		 * removed until accountable evidence packets approve them.
		 *
		 * @param array $data   Rank Math JSON-LD graph keyed by entity name.
		 * @param mixed $jsonld Rank Math JSON-LD context object (unused).
		 * @return array
		 */
		public static function filter_unverified_schema( $data, $jsonld = null ) {
			unset( $jsonld );
			if ( ! self::is_frontend_request() || ! is_array( $data ) ) {
				return $data;
			}

			if ( is_front_page() ) {
				foreach ( $data as $key => $entity ) {
					if ( self::schema_entity_has_unverified_type( $entity ) ) {
						unset( $data[ $key ] );
					}
				}
				$data = self::remove_unverified_schema_relationships( $data );
			}

			return self::normalize_same_site_schema_urls( $data );
		}

		/**
		 * Whether a schema entity makes an assertion that is not yet approved.
		 *
		 * @param mixed $entity Candidate entity.
		 * @return bool
		 */
		private static function schema_entity_has_unverified_type( $entity ) {
			if ( ! is_array( $entity ) || ! isset( $entity['@type'] ) ) {
				return false;
			}
			$types = is_array( $entity['@type'] ) ? $entity['@type'] : array( $entity['@type'] );
			$types = array_map( 'strval', $types );
			return (bool) array_intersect( array( 'Article', 'Person', 'Organization', 'EducationalOrganization' ), $types );
		}

		/**
		 * Remove references to entities deliberately omitted from the homepage.
		 *
		 * @param mixed $value Schema subtree.
		 * @return mixed
		 */
		private static function remove_unverified_schema_relationships( $value ) {
			if ( ! is_array( $value ) ) {
				return $value;
			}
			foreach ( array( 'about', 'author', 'publisher', 'reviewedBy', 'worksFor' ) as $relationship ) {
				unset( $value[ $relationship ] );
			}
			foreach ( $value as $key => $child ) {
				$value[ $key ] = self::remove_unverified_schema_relationships( $child );
			}
			return $value;
		}

		/**
		 * Upgrade only URLs on the current site, preserving unrelated external URLs.
		 *
		 * @param mixed $value Schema subtree.
		 * @return mixed
		 */
		private static function normalize_same_site_schema_urls( $value ) {
			if ( is_array( $value ) ) {
				foreach ( $value as $key => $child ) {
					$value[ $key ] = self::normalize_same_site_schema_urls( $child );
				}
				return $value;
			}
			if ( ! is_string( $value ) || 0 !== strpos( $value, 'http://' ) ) {
				return $value;
			}

			$site_host     = strtolower( preg_replace( '/^www\./i', '', (string) wp_parse_url( home_url( '/' ), PHP_URL_HOST ) ) );
			$value_host    = strtolower( preg_replace( '/^www\./i', '', (string) wp_parse_url( $value, PHP_URL_HOST ) ) );
			$allowed_hosts = array_filter( array( $site_host, 'aiamigos.org' ) );
			return in_array( $value_host, $allowed_hosts, true ) ? set_url_scheme( $value, 'https' ) : $value;
		}

		/**
		 * Canonical URL for supported SEO plugins on /blog/ pages.
		 *
		 * @param string $canonical Existing canonical.
		 * @return string
		 */
		public static function filter_blog_canonical( $canonical ) {
			if ( ! self::is_blog_archive_request() ) {
				return $canonical;
			}
			$paged = max( 1, (int) get_query_var( 'paged' ) );
			$path  = self::blog_base_path();
			if ( 1 < $paged ) {
				$path .= 'page/' . $paged . '/';
			}
			return self::canonical_url_for_path( $path );
		}

		/**
		 * Apply 410 and redirect policy before theme rendering.
		 *
		 * @return void
		 */
		public static function apply_route_policy() {
			if ( ! self::is_frontend_request() ) {
				return;
			}

			$request_uri = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/';
			$path        = AIAmigos_Remediation_Policy::normalize_path( $request_uri );
			if ( AIAmigos_Remediation_Policy::path_is_listed( $path, self::gone_paths() ) ) {
				self::render_gone_response();
			}

			$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
			if ( ! in_array( $method, array( 'GET', 'HEAD' ), true ) ) {
				return;
			}

			$target_path = AIAmigos_Remediation_Policy::redirect_target_path( $path, self::redirect_paths(), self::blog_base_path() );
			if ( null === $target_path ) {
				return;
			}

			$destination = self::canonical_url_for_path( $target_path );
			if ( apply_filters( 'aiamigos_remediation_preserve_redirect_query', true, $path, $target_path ) ) {
				$query = parse_url( (string) $request_uri, PHP_URL_QUERY );
				if ( is_string( $query ) && '' !== $query ) {
					$destination .= '?' . str_replace( array( "\r", "\n" ), '', $query );
				}
			}

			$status = (int) apply_filters( 'aiamigos_remediation_redirect_status', 301, $path, $target_path );
			if ( ! in_array( $status, array( 301, 308 ), true ) ) {
				$status = 301;
			}
			if ( wp_safe_redirect( $destination, $status, 'AI Amigos Remediation' ) ) {
				exit;
			}
		}

		/**
		 * Build a canonical URL from a normalized site path.
		 *
		 * @param string $path Site path.
		 * @return string
		 */
		private static function canonical_url_for_path( $path ) {
			return rtrim( self::canonical_base_url(), '/' ) . AIAmigos_Remediation_Policy::normalize_path( $path );
		}

		/**
		 * Allow wp_safe_redirect to use the configured canonical www host.
		 *
		 * @param array $hosts Allowed hosts.
		 * @return array
		 */
		public static function allow_canonical_redirect_host( $hosts ) {
			$host = wp_parse_url( self::canonical_base_url(), PHP_URL_HOST );
			if ( $host ) {
				$hosts[] = $host;
			}
			return array_values( array_unique( $hosts ) );
		}

		/**
		 * Emit an explicit, uncached 410 without buffering the document.
		 *
		 * @return void
		 */
		private static function render_gone_response() {
			status_header( 410 );
			nocache_headers();
			header( 'X-Robots-Tag: noindex, nofollow', true );

			$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
			if ( 'HEAD' === $method ) {
				exit;
			}

			$template = locate_template( array( '410.php' ), false, false );
			if ( $template ) {
				include $template;
				exit;
			}

			wp_die(
				esc_html__( 'This demonstration record has been permanently removed.', 'aiamigos-remediation' ),
				esc_html__( 'Content removed', 'aiamigos-remediation' ),
				array( 'response' => 410 )
			);
		}

		/**
		 * Determine noindex status for exact high-risk pages and archive surfaces.
		 *
		 * @return bool
		 */
		private static function should_noindex() {
			if ( ! self::is_frontend_request() ) {
				return false;
			}
			$path = AIAmigos_Remediation_Policy::normalize_path( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/' );
			if ( AIAmigos_Remediation_Policy::path_is_listed( $path, self::high_risk_noindex_paths() ) ) {
				return (bool) apply_filters( 'aiamigos_remediation_should_noindex', true, $path, 'high-risk-path' );
			}
			if ( self::is_blog_archive_request() ) {
				return false;
			}

			$is_archive_surface = is_author() || is_category() || is_tag() || is_tax() || is_date() || is_search() || is_post_type_archive();
			$is_archive_surface = (bool) apply_filters( 'aiamigos_remediation_noindex_archive_surfaces', $is_archive_surface, $path );
			return (bool) apply_filters( 'aiamigos_remediation_should_noindex', $is_archive_surface, $path, 'archive-surface' );
		}

		/**
		 * Add core robots directives.
		 *
		 * @param array $robots Robots directives.
		 * @return array
		 */
		public static function filter_wp_robots( $robots ) {
			if ( self::should_noindex() ) {
				unset( $robots['index'], $robots['nofollow'] );
				$robots['noindex'] = true;
				$robots['follow']  = true;
			}
			return $robots;
		}

		/**
		 * Add noindex to Rank Math's array or string contract.
		 *
		 * @param mixed $robots Rank Math directives.
		 * @return mixed
		 */
		public static function filter_rank_math_robots( $robots ) {
			if ( ! self::should_noindex() ) {
				return $robots;
			}
			if ( is_array( $robots ) ) {
				unset( $robots['index'], $robots['nofollow'] );
				$robots['noindex'] = 'noindex';
				$robots['follow'] = 'follow';
				return $robots;
			}
			return self::force_noindex_string( $robots );
		}

		/**
		 * Add noindex to string-based SEO plugin contracts.
		 *
		 * @param string $robots Robots string.
		 * @return string
		 */
		public static function filter_robots_string( $robots ) {
			return self::should_noindex() ? self::force_noindex_string( $robots ) : $robots;
		}

		/**
		 * Normalize a robots string to noindex,follow without destructive nofollow.
		 *
		 * @param mixed $robots Existing value.
		 * @return string
		 */
		private static function force_noindex_string( $robots ) {
			$directives = preg_split( '/\s*,\s*/', strtolower( (string) $robots ), -1, PREG_SPLIT_NO_EMPTY );
			$directives = array_diff( $directives, array( 'index', 'noindex', 'follow', 'nofollow' ) );
			array_unshift( $directives, 'noindex', 'follow' );
			return implode( ', ', array_values( array_unique( $directives ) ) );
		}

		/**
		 * Add conservative front-end headers and a redundant X-Robots-Tag.
		 *
		 * @param array $headers Response headers.
		 * @return array
		 */
		public static function filter_response_headers( $headers ) {
			if ( ! self::is_frontend_request() ) {
				return $headers;
			}
			$secure = is_ssl() || ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && 'https' === strtolower( sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) ) ) );
			$policy = array(
				'X-Content-Type-Options' => 'nosniff',
				'X-Frame-Options'        => 'SAMEORIGIN',
				'Referrer-Policy'        => 'strict-origin-when-cross-origin',
				'Permissions-Policy'     => 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
			);
			if ( $secure ) {
				$policy['Strict-Transport-Security'] = 'max-age=15552000';
			}
			$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
			$cacheable = ! is_user_logged_in() && ! is_preview() && ! is_404() && ! is_search() && ! is_feed() && ! post_password_required();
			if ( $cacheable && in_array( $method, array( 'GET', 'HEAD' ), true ) && empty( $headers['Cache-Control'] ) ) {
				$headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=30';
			}
			$policy = apply_filters( 'aiamigos_remediation_security_headers', $policy );
			if ( is_array( $policy ) ) {
				foreach ( $policy as $name => $value ) {
					if ( is_string( $name ) && preg_match( '/^[A-Za-z0-9-]+$/', $name ) && is_scalar( $value ) ) {
						$headers[ $name ] = str_replace( array( "\r", "\n" ), '', (string) $value );
					}
				}
			}
			// wp_headers can run before the main query is populated. Exact paths are
			// safe here; archive surfaces receive their meta robots directive later.
			$path = AIAmigos_Remediation_Policy::normalize_path( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/' );
			if ( AIAmigos_Remediation_Policy::path_is_listed( $path, self::high_risk_noindex_paths() ) ) {
				$headers['X-Robots-Tag'] = 'noindex, follow';
			}
			return $headers;
		}

		/**
		 * Remove the PHP version disclosure when the hosting layer permits it.
		 *
		 * @return void
		 */
		public static function remove_runtime_disclosure_header() {
			if ( self::is_frontend_request() && function_exists( 'header_remove' ) ) {
				header_remove( 'X-Powered-By' );
			}
		}

		/**
		 * Normalize same-site nav menu links only; external links are untouched.
		 *
		 * @param array   $atts  Link attributes.
		 * @param WP_Post $item  Menu item.
		 * @param stdClass $args Menu arguments.
		 * @param int     $depth Menu depth.
		 * @return array
		 */
		public static function normalize_menu_link( $atts, $item, $args, $depth ) {
			if ( self::is_frontend_request() && ! empty( $atts['href'] ) ) {
				$atts['href'] = AIAmigos_Remediation_Policy::normalize_menu_url( $atts['href'], self::canonical_base_url(), self::redirect_paths(), self::blog_base_path() );
				$decision     = self::known_href_decision( $atts['href'] );
				if ( 'rewrite' === $decision['action'] ) {
					$atts['href'] = $decision['href'];
				} elseif ( 'unlink' === $decision['action'] ) {
					unset( $atts['href'], $atts['target'], $atts['rel'] );
				}
			}
			return $atts;
		}

		/**
		 * Decide one exact captured href remediation without changing unrelated URLs.
		 *
		 * @param string $href Candidate href.
		 * @return array{action:string,href:string}
		 */
		private static function known_href_decision( $href ) {
			$href    = trim( html_entity_decode( (string) $href, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
			$default = array( 'action' => 'keep', 'href' => $href );
			if ( '' === $href || 0 === strpos( $href, '#' ) ) {
				return $default;
			}

			$lower = strtolower( $href );
			$exact_https = array(
				'http://designs.ai'  => 'https://designs.ai/',
				'http://elai.io'     => 'https://elai.io/',
				'http://kaiber.ai'   => 'https://kaiber.ai/',
				'http://rephrase.ai' => 'https://rephrase.ai/',
				'http://veed.io'     => 'https://www.veed.io/',
			);
			$scheme_key = rtrim( $lower, '/' );
			if ( isset( $exact_https[ $scheme_key ] ) ) {
				return array( 'action' => 'rewrite', 'href' => $exact_https[ $scheme_key ] );
			}
			if ( in_array( $lower, array( 'www.youtube.com/@aieducation4kids', '//www.youtube.com/@aieducation4kids' ), true ) ) {
				return array( 'action' => 'unlink', 'href' => '' );
			}

			$parts = wp_parse_url( $href );
			if ( false === $parts ) {
				return $default;
			}
			$host = isset( $parts['host'] ) ? strtolower( preg_replace( '/^www\./i', '', (string) $parts['host'] ) ) : '';
			$path = isset( $parts['path'] ) ? AIAmigos_Remediation_Policy::normalize_path( rawurldecode( (string) $parts['path'] ) ) : '/';
			$path = strtolower( $path );

			if ( 'www.youtube.com' === ( isset( $parts['host'] ) ? strtolower( (string) $parts['host'] ) : '' ) ) {
				if ( '/@aiamigos-sn8uf/' === $path ) {
					return array( 'action' => 'rewrite', 'href' => 'https://www.youtube.com/@AIamigos-sn8uf' );
				}
				if ( '/@aieducation4kids/' === $path ) {
					return array( 'action' => 'unlink', 'href' => '' );
				}
			}
			if ( 'ai.baidu.com' === $host && '/' === $path ) {
				return array( 'action' => 'rewrite', 'href' => 'https://ai.baidu.com/' );
			}
			if ( '/academy/www.youtube.com/@aieducation4kids/' === $path ) {
				return array( 'action' => 'unlink', 'href' => '' );
			}

			$home_host = strtolower( preg_replace( '/^www\./i', '', (string) wp_parse_url( home_url( '/' ), PHP_URL_HOST ) ) );
			$is_internal = '' === $host || $host === $home_host || 'aiamigos.org' === $host;
			if ( ! $is_internal ) {
				return $default;
			}

			$rewrites = array(
				'/index.php/blog/' => '/blog/',
				'/ai-app-development/' => '/ai-app-development/',
				'/the-magical-world-of-ai-from-baby-steps-to-quantum-leaps/' => '/ai-evolution/',
				'/ai-career-path/' => '/ai-career-paths/',
			);
			if ( isset( $rewrites[ $path ] ) ) {
				return array( 'action' => 'rewrite', 'href' => self::canonical_url_for_path( $rewrites[ $path ] ) );
			}
			$unlinks = array(
				'/grokai/',
				'/demystifying-artificial-intelligence-ai-how-does-it-shape-our-world/',
				'/ai-certifications/',
				'/services/',
				'/classes/',
				'/ai-tools-for-kids/',
				'/ai-books-for-kids/',
				'/page/',
				'/academy/',
				'/ai-career/',
			);
			if ( in_array( $path, $unlinks, true ) ) {
				return array( 'action' => 'unlink', 'href' => '' );
			}

			return $default;
		}

		/**
		 * Rewrite or unlink only the captured anchors, retaining their visible text.
		 *
		 * @param string $content Trusted WordPress-rendered fragment.
		 * @return string
		 */
		public static function repair_known_output_links( $content ) {
			if ( ! self::is_frontend_request() || false === stripos( (string) $content, '<a' ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
				return $content;
			}
			$processor = new WP_HTML_Tag_Processor( (string) $content );
			while ( $processor->next_tag( 'A' ) ) {
				$href = $processor->get_attribute( 'href' );
				if ( ! is_string( $href ) ) {
					continue;
				}
				$decision = self::known_href_decision( $href );
				if ( 'rewrite' === $decision['action'] ) {
					$processor->set_attribute( 'href', $decision['href'] );
				} elseif ( 'unlink' === $decision['action'] ) {
					$processor->remove_attribute( 'href' );
					$processor->remove_attribute( 'target' );
					$processor->remove_attribute( 'rel' );
				}
			}
			return $processor->get_updated_html();
		}

		/**
		 * Correct exact editor links and semantic heading defects in main content.
		 *
		 * @param string $content Main editor content.
		 * @return string
		 */
		public static function repair_editor_content( $content ) {
			if ( ! self::is_frontend_request() || is_feed() || ! is_singular() || ! is_main_query() || ! in_the_loop() ) {
				return $content;
			}
			$content  = self::repair_known_output_links( $content );
			$previous = 1;
			$repaired = preg_replace_callback(
				'#<h([1-6])\b([^>]*)>(.*?)</h\1\s*>#is',
				static function ( $matches ) use ( &$previous ) {
					$level      = (int) $matches[1];
					$attributes = (string) $matches[2];
					$inner      = (string) $matches[3];
					$text       = trim( html_entity_decode( wp_strip_all_tags( $inner, true ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
					if ( '' === $text ) {
						$attributes = preg_replace( '/\s+(?:role\s*=\s*(?:"heading"|\'heading\'|heading)|aria-level\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))/i', '', $attributes );
						return preg_match( '/<(?:img|picture|svg)\b/i', $inner ) ? '<div' . $attributes . '>' . $inner . '</div>' : '';
					}

					preg_match_all( '/[\p{L}\p{N}][\p{L}\p{N}\x{2019}\x{0027}-]*/u', $text, $words );
					if ( isset( $words[0] ) && count( $words[0] ) > 60 ) {
						$attributes = preg_replace( '/\s+(?:role\s*=\s*(?:"heading"|\'heading\'|heading)|aria-level\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))/i', '', $attributes );
						return '<p' . $attributes . '>' . $inner . '</p>';
					}

					if ( 1 === $level ) {
						$level = 2;
					}
					if ( $level > $previous + 1 ) {
						$level = $previous + 1;
					}
					$previous = $level;
					return '<h' . $level . $attributes . '>' . $inner . '</h' . $level . '>';
				},
				(string) $content
			);
			return is_string( $repaired ) ? $repaired : $content;
		}

		/**
		 * Replace two exact visible template strings without altering stored data.
		 *
		 * @param string $translation Current translation.
		 * @param string $text        Original source text.
		 * @param string $domain      Translation domain.
		 * @return string
		 */
		public static function correct_exact_ui_strings( $translation, $text, $domain ) {
			if ( ! self::is_frontend_request() ) {
				return $translation;
			}
			$replacements = array(
				'Service Url' => 'Service page',
				'Linkden'     => 'LinkedIn',
			);
			return isset( $replacements[ $text ] ) ? $replacements[ $text ] : $translation;
		}

		/**
		 * Register one runtime filter for the active theme's flat theme-mod option.
		 *
		 * @return void
		 */
		public static function register_theme_mod_option_filter() {
			$stylesheet = (string) get_option( 'stylesheet' );
			if ( '' !== $stylesheet ) {
				add_filter( 'option_theme_mods_' . $stylesheet, array( __CLASS__, 'filter_theme_mod_urls' ), 99 );
			}
		}

		/**
		 * Repair exact URL-valued theme mods, including the blog CTA and social URL.
		 *
		 * @param mixed $mods Active theme mods.
		 * @return mixed
		 */
		public static function filter_theme_mod_urls( $mods ) {
			if ( ! self::is_frontend_request() || ! is_array( $mods ) ) {
				return $mods;
			}
			array_walk_recursive(
				$mods,
				static function ( &$value ) {
					if ( ! is_string( $value ) ) {
						return;
					}
					$decision = self::known_href_decision( $value );
					if ( 'rewrite' === $decision['action'] ) {
						$value = $decision['href'];
					}
				}
			);
			return $mods;
		}

		/**
		 * Remove async/defer only from exact WordPress dependency handles.
		 *
		 * @param string $tag    Script tag.
		 * @param string $handle Script handle.
		 * @param string $src    Script URL.
		 * @return string
		 */
		public static function make_wp_dependencies_blocking( $tag, $handle, $src ) {
			$handles = apply_filters( 'aiamigos_remediation_blocking_wp_dependency_handles', array( 'wp-hooks', 'wp-i18n' ) );
			if ( is_array( $handles ) && in_array( $handle, $handles, true ) ) {
				return AIAmigos_Remediation_Policy::strip_script_loading_strategy( $tag );
			}
			return $tag;
		}

		/**
		 * Remove exact Site Kit registration callbacks for unreviewed tracking/ads.
		 *
		 * Site Kit registers these public module methods on template_redirect. The
		 * removal is object- and method-specific, leaves dashboard access intact, and
		 * avoids rewriting Site Kit's saved settings. It can be released after legal
		 * and consent review through the filter below.
		 *
		 * @return void
		 */
		public static function disable_unreviewed_site_kit_tags() {
			if ( ! self::is_frontend_request() || ! apply_filters( 'aiamigos_remediation_disable_measurement_scripts', true ) ) {
				return;
			}
			global $wp_filter;
			if ( empty( $wp_filter['template_redirect'] ) || ! $wp_filter['template_redirect'] instanceof WP_Hook ) {
				return;
			}

			$blocked_classes = array(
				'Google\\Site_Kit\\Modules\\AdSense',
				'Google\\Site_Kit\\Modules\\Analytics',
				'Google\\Site_Kit\\Modules\\Analytics_4',
			);
			foreach ( $wp_filter['template_redirect']->callbacks as $priority => $callbacks ) {
				foreach ( $callbacks as $callback ) {
					$function = isset( $callback['function'] ) ? $callback['function'] : null;
					if ( ! is_array( $function ) || ! isset( $function[0], $function[1] ) || ! is_object( $function[0] ) || 'register_tag' !== $function[1] ) {
						continue;
					}
					if ( in_array( get_class( $function[0] ), $blocked_classes, true ) ) {
						remove_action( 'template_redirect', $function, $priority );
					}
				}
			}
		}

		/**
		 * Dequeue only known tracking and form assets after all plugins enqueue.
		 *
		 * @return void
		 */
		public static function dequeue_nonessential_frontend_assets() {
			if ( ! self::is_frontend_request() ) {
				return;
			}
			if ( apply_filters( 'aiamigos_remediation_disable_measurement_scripts', true ) ) {
				foreach ( array( 'google_gtagjs', 'googlesitekit-consent-mode' ) as $handle ) {
					wp_dequeue_script( $handle );
				}
			}
			if ( apply_filters( 'aiamigos_remediation_disable_unreviewed_chatbot', true ) ) {
				wp_dequeue_script( 'hostinger_chatbot' );
				wp_deregister_script( 'hostinger_chatbot' );
				foreach ( array( 'hostinger_chatbot_vendor', 'hostinger_chatbot' ) as $handle ) {
					wp_dequeue_style( $handle );
					wp_deregister_style( $handle );
				}
			}
			$allow_collection_form = self::is_newsletter_request() && apply_filters( 'aiamigos_remediation_enable_collection_form', false );
			if ( ! $allow_collection_form ) {
				foreach ( array( 'swv', 'contact-form-7', 'wpcf7-recaptcha', 'google-recaptcha' ) as $handle ) {
					wp_dequeue_script( $handle );
				}
				foreach ( array( 'contact-form-7', 'contact-form-7-rtl' ) as $handle ) {
					wp_dequeue_style( $handle );
				}
			}
		}

		/**
		 * Remove preconnect/dns-prefetch entries for services disabled above.
		 *
		 * @param array  $urls          Resource hints.
		 * @param string $relation_type Hint relation type.
		 * @return array
		 */
		public static function filter_disabled_service_resource_hints( $urls, $relation_type ) {
			if ( ! is_array( $urls ) || ! self::is_frontend_request() || ! apply_filters( 'aiamigos_remediation_disable_measurement_scripts', true ) ) {
				return $urls;
			}
			$blocked_hosts = array( 'www.googletagmanager.com', 'pagead2.googlesyndication.com' );
			return array_values(
				array_filter(
					$urls,
					static function ( $hint ) use ( $blocked_hosts ) {
						$url  = is_array( $hint ) && isset( $hint['href'] ) ? $hint['href'] : $hint;
						$host = wp_parse_url( 0 === strpos( (string) $url, '//' ) ? 'https:' . $url : (string) $url, PHP_URL_HOST );
						return ! $host || ! in_array( strtolower( $host ), $blocked_hosts, true );
					}
				)
			);
		}

		/**
		 * Replace unsupported institutional and collection claims with bounded,
		 * observable copy on the two exact public pages. Stored revisions remain
		 * untouched and recoverable; this filter runs only in the main page loop.
		 *
		 * @param string $content Stored page content.
		 * @return string
		 */
		public static function render_bounded_institutional_page( $content ) {
			if ( ! self::is_frontend_request() || ! is_page() || ! is_main_query() || ! in_the_loop() ) {
				return $content;
			}

			$slug = self::current_singular_slug();
			if ( 'about-us' === $slug ) {
				$email = sanitize_email( (string) apply_filters( 'aiamigos_remediation_contact_email', 'contact@aiamigos.org' ) );
				if ( ! is_email( $email ) ) {
					$email = 'contact@aiamigos.org';
				}
				return sprintf(
					'<div class="aiamigos-bounded-page"><p>%1$s</p><section aria-labelledby="aiamigos-about-scope"><h2 id="aiamigos-about-scope">%2$s</h2><p>%3$s</p></section><section aria-labelledby="aiamigos-about-editor"><h2 id="aiamigos-about-editor">%4$s</h2><p>%5$s</p></section><section aria-labelledby="aiamigos-about-corrections"><h2 id="aiamigos-about-corrections">%6$s</h2><p>%7$s <a href="%8$s">%9$s</a>.</p></section></div>',
					esc_html__( 'AI Amigos publishes educational articles about artificial intelligence concepts, tools, learning paths and responsible use.', 'aiamigos-remediation' ),
					esc_html__( 'Scope and limitations', 'aiamigos-remediation' ),
					esc_html__( 'Some archived articles cover fast-changing subjects. Check each publication date, cited sources and current official documentation before relying on details. This site does not replace medical, legal, financial or employment advice.', 'aiamigos-remediation' ),
					esc_html__( 'Editor', 'aiamigos-remediation' ),
					esc_html__( 'Vijay Bhoyar is listed as the founder and editor responsible for the current AI Amigos review process.', 'aiamigos-remediation' ),
					esc_html__( 'Corrections', 'aiamigos-remediation' ),
					esc_html__( 'To report an error or request an update, email', 'aiamigos-remediation' ),
					esc_url( 'mailto:' . $email ),
					esc_html( $email )
				);
			}

			if ( 'contact' === $slug ) {
				$email = sanitize_email( (string) apply_filters( 'aiamigos_remediation_contact_email', 'contact@aiamigos.org' ) );
				if ( ! is_email( $email ) ) {
					$email = 'contact@aiamigos.org';
				}
				return sprintf(
					'<div class="aiamigos-bounded-page"><p>%1$s</p><p><strong>%2$s</strong> %3$s</p><p><a href="%4$s">%5$s</a></p><p>%6$s <a href="%7$s">%8$s</a>.</p></div>',
					esc_html__( 'Use this address for editorial corrections, content questions or update requests.', 'aiamigos-remediation' ),
					esc_html__( 'Do not send', 'aiamigos-remediation' ),
					esc_html__( 'confidential information or medical, financial, legal, employment or children\'s personal data. File uploads and the former phone field are disabled while the data-handling review remains open.', 'aiamigos-remediation' ),
					esc_url( 'mailto:' . $email ),
					sprintf( esc_html__( 'Email %s', 'aiamigos-remediation' ), esc_html( $email ) ),
					esc_html__( 'Retention and response timing are not yet published. Review the current', 'aiamigos-remediation' ),
					esc_url( home_url( '/privacy-policy-2/' ) ),
					esc_html__( 'privacy notice', 'aiamigos-remediation' )
				);
			}

			return $content;
		}

		/**
		 * Whether the current request is the single canonical newsletter page.
		 *
		 * @return bool
		 */
		private static function is_newsletter_request() {
			if ( ! self::is_frontend_request() || ! is_page() ) {
				return false;
			}
			$path = AIAmigos_Remediation_Policy::normalize_path( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/' );
			return is_page( 157 ) || '/newsletter/' === strtolower( $path );
		}

		/**
		 * Replace broken MailPoet IDs 2/3 with an honestly labelled CF7 request.
		 *
		 * @param string $content Widget or page content.
		 * @return string
		 */
		public static function replace_mailpoet_form( $content ) {
			if ( ! self::is_frontend_request() || false === stripos( (string) $content, '[mailpoet_form' ) ) {
				return $content;
			}
			$form_ids = apply_filters( 'aiamigos_remediation_mailpoet_form_ids', array( 2, 3 ) );
			$form_ids = is_array( $form_ids ) ? array_map( 'absint', $form_ids ) : array( 2, 3 );
			$allow_cf7 = apply_filters( 'aiamigos_remediation_enable_collection_form', false ) && self::is_newsletter_request() && 'the_content' === current_filter() && is_main_query() && in_the_loop();
			return AIAmigos_Remediation_Policy::replace_mailpoet_forms( $content, self::update_request_markup( $allow_cf7 ), $form_ids );
		}

		/**
		 * Replace only the misleading title attached to the affected text widget.
		 *
		 * @param string $title    Widget title.
		 * @param array  $instance Widget instance.
		 * @param string $id_base  Widget base ID.
		 * @return string
		 */
		public static function label_update_request_widget( $title, $instance = array(), $id_base = '' ) {
			$text = is_array( $instance ) && isset( $instance['text'] ) ? (string) $instance['text'] : '';
			if ( self::is_frontend_request() && false !== stripos( $text, '[mailpoet_form' ) ) {
				// The replacement section carries its own accessible label. Returning
				// an empty title avoids the theme's sitewide H3 hierarchy defect.
				return '';
			}
			return $title;
		}

		/**
		 * Build request markup without claiming an automatic newsletter signup.
		 *
		 * @return string
		 */
		private static function update_request_markup( $allow_cf7 = false ) {
			$form       = '';
			$form_title = trim( (string) apply_filters( 'aiamigos_remediation_cf7_form_title', 'Subscribe Newsletter Form' ) );
			$intro      = esc_html__( 'Send a request to receive information about future AI Amigos updates. This is a contact request, not an automatic newsletter subscription.', 'aiamigos-remediation' );

			if ( $allow_cf7 && '' !== $form_title && class_exists( 'WPCF7_ContactForm' ) && is_callable( array( 'WPCF7_ContactForm', 'find' ) ) && shortcode_exists( 'contact-form-7' ) ) {
				$forms = WPCF7_ContactForm::find(
					array(
						'title'          => $form_title,
						'post_status'    => 'publish',
						'posts_per_page' => 2,
					)
				);
				$exact = array();
				if ( is_array( $forms ) ) {
					foreach ( $forms as $candidate ) {
						if ( is_object( $candidate ) && is_callable( array( $candidate, 'title' ) ) && $form_title === trim( (string) $candidate->title() ) ) {
							$exact[] = $candidate;
						}
					}
				}
				if ( 1 === count( $exact ) && is_callable( array( $exact[0], 'shortcode' ) ) ) {
					$shortcode = (string) $exact[0]->shortcode();
					if ( '' !== trim( $shortcode ) ) {
						$form = (string) do_shortcode( $shortcode );
					}
				}
			}

			if ( '' === trim( $form ) ) {
				$email = sanitize_email( (string) apply_filters( 'aiamigos_remediation_contact_email', 'contact@aiamigos.org' ) );
				if ( ! is_email( $email ) ) {
					$email = 'contact@aiamigos.org';
				}
				$form = sprintf(
					'<p><a href="%s">%s</a></p>',
					esc_url( 'mailto:' . $email ),
					sprintf( esc_html__( 'Email %s to request updates.', 'aiamigos-remediation' ), esc_html( $email ) )
				);
			}
			return sprintf(
				'<section class="aiamigos-update-request" aria-label="%1$s"><p class="aiamigos-update-request__label">%1$s</p><p>%2$s</p>%3$s</section>',
				esc_attr__( 'AI Amigos update request', 'aiamigos-remediation' ),
				$intro,
				$form
			);
		}

		/**
		 * Render one factual author/date line on standard single posts.
		 *
		 * @param string $content Post content.
		 * @return string
		 */
		public static function prepend_accountable_byline( $content ) {
			if ( ! self::is_frontend_request() || is_feed() || ! is_singular( 'post' ) || ! is_main_query() || ! in_the_loop() ) {
				return $content;
			}
			$post_id = get_the_ID();
			if ( ! $post_id || isset( self::$byline_rendered[ $post_id ] ) ) {
				return $content;
			}
			self::$byline_rendered[ $post_id ] = true;

			$author_id   = (int) get_post_field( 'post_author', $post_id );
			$author_name = trim( (string) get_the_author_meta( 'display_name', $author_id ) );
			if ( '' === $author_name ) {
				return $content;
			}
			$published_timestamp = (int) get_post_time( 'U', true, $post_id );
			$modified_timestamp  = (int) get_post_modified_time( 'U', true, $post_id );
			$published_iso       = get_post_time( DATE_W3C, true, $post_id );
			$modified_iso        = get_post_modified_time( DATE_W3C, true, $post_id );
			$published_display   = get_the_date( get_option( 'date_format' ), $post_id );
			$modified_display    = get_the_modified_date( get_option( 'date_format' ), $post_id );
			$author_url          = get_author_posts_url( $author_id );

			$byline = sprintf(
				'<p class="aiamigos-accountable-byline"><span>%1$s <a rel="author" href="%2$s">%3$s</a></span><span>%4$s <time datetime="%5$s">%6$s</time></span>',
				esc_html__( 'By', 'aiamigos-remediation' ),
				esc_url( $author_url ),
				esc_html( $author_name ),
				esc_html__( 'Published', 'aiamigos-remediation' ),
				esc_attr( $published_iso ),
				esc_html( $published_display )
			);
			if ( $modified_timestamp >= $published_timestamp + DAY_IN_SECONDS ) {
				$byline .= sprintf(
					'<span>%1$s <time datetime="%2$s">%3$s</time></span>',
					esc_html__( 'Updated', 'aiamigos-remediation' ),
					esc_attr( $modified_iso ),
					esc_html( $modified_display )
				);
			}
			$byline .= '</p>';
			return $byline . $content;
		}

		/**
		 * Correct Sirat's widget-title hierarchy without changing widget data.
		 *
		 * @param array $params Dynamic-sidebar parameters.
		 * @return array
		 */
		public static function normalize_widget_heading_level( $params ) {
			if ( ! self::is_frontend_request() || ! is_array( $params ) || empty( $params[0] ) || ! is_array( $params[0] ) ) {
				return $params;
			}
			if ( isset( $params[0]['before_title'] ) ) {
				$params[0]['before_title'] = preg_replace( '/<h3\b/i', '<h2', (string) $params[0]['before_title'], 1 );
			}
			if ( isset( $params[0]['after_title'] ) ) {
				$params[0]['after_title'] = preg_replace( '#</h3>#i', '</h2>', (string) $params[0]['after_title'], 1 );
			}
			return $params;
		}

		/**
		 * Read an unfiltered theme mod so phone/email migration has no recursion.
		 *
		 * @param string $name Theme mod name.
		 * @return mixed|null
		 */
		private static function raw_theme_mod( $name ) {
			$stylesheet = get_option( 'stylesheet' );
			$mods       = $stylesheet ? get_option( 'theme_mods_' . $stylesheet, array() ) : array();
			return is_array( $mods ) && array_key_exists( $name, $mods ) ? $mods[ $name ] : null;
		}

		/**
		 * Suppress email-like data from the theme's tel: field; preserve phones.
		 *
		 * @param mixed $value Theme mod value.
		 * @return mixed
		 */
		public static function filter_theme_phone_mod( $value ) {
			if ( self::is_frontend_request() && AIAmigos_Remediation_Policy::is_email_like( $value ) ) {
				return '';
			}
			return $value;
		}

		/**
		 * Recover the valid misplaced email only when the email field is empty.
		 *
		 * @param mixed $value Dedicated email mod.
		 * @return mixed
		 */
		public static function filter_theme_email_mod( $value ) {
			if ( ! self::is_frontend_request() || '' !== trim( (string) $value ) ) {
				return $value;
			}
			$misplaced = self::raw_theme_mod( 'vw_sirat_pro_header_section_call2' );
			return AIAmigos_Remediation_Policy::is_email_like( $misplaced ) ? sanitize_email( $misplaced ) : $value;
		}

		/**
		 * Dynamic footer notice; the stored Customizer value is untouched.
		 *
		 * @param mixed $value Existing footer text.
		 * @return mixed
		 */
		public static function filter_footer_copy_mod( $value ) {
			if ( ! self::is_frontend_request() ) {
				return $value;
			}
			$year = function_exists( 'wp_date' ) ? wp_date( 'Y' ) : gmdate( 'Y' );
			$copy = sprintf( '© %s AI Amigos.', $year );
			return apply_filters( 'aiamigos_remediation_footer_copy', $copy, $year );
		}

		/**
		 * Hide the misleading theme credit on the public front end.
		 *
		 * @param mixed $value Existing setting.
		 * @return mixed
		 */
		public static function hide_theme_credit_mod( $value ) {
			return self::is_frontend_request() ? false : $value;
		}

		/**
		 * Hide the parent theme's service promotion while every referenced offer
		 * remains in the evidence-gated staging quarantine.
		 *
		 * @param mixed $value Existing theme setting.
		 * @return mixed
		 */
		public static function disable_unverified_services_section( $value ) {
			return self::is_frontend_request() ? 'Disable' : $value;
		}

		/**
		 * Hide the legacy footer widget area while it advertises unsupported hours,
		 * phone, location and update-processing claims. Copyright remains visible.
		 *
		 * @param mixed $value Existing theme setting.
		 * @return mixed
		 */
		public static function disable_unreviewed_footer_widgets( $value ) {
			return self::is_frontend_request() ? 'Disable' : $value;
		}

		/**
		 * Register small component styles without editing or buffering templates.
		 *
		 * @return void
		 */
		public static function enqueue_inline_styles() {
			if ( ! self::is_frontend_request() ) {
				return;
			}
			wp_register_style( 'aiamigos-remediation', false, array(), AIAMIGOS_REMEDIATION_VERSION );
			wp_enqueue_style( 'aiamigos-remediation' );
			wp_add_inline_style(
				'aiamigos-remediation',
				'.aiamigos-remediation-intro,.aiamigos-remediation-blog-heading{max-width:1140px;margin:1.5rem auto;padding:0 1rem}.aiamigos-remediation-intro h1,.aiamigos-remediation-blog-heading{overflow-wrap:anywhere}.aiamigos-update-request__label{font-weight:700}.aiamigos-update-request{max-width:42rem}.aiamigos-accountable-byline{display:flex;flex-wrap:wrap;gap:.35rem 1rem;margin:0 0 1.25rem;font-size:.95rem}'
			);
		}

		/**
		 * Add the requested cautious front-page H1 after the theme slider.
		 *
		 * @return void
		 */
		public static function render_front_page_intro() {
			if ( self::$front_intro_rendered || ! self::is_frontend_request() || ! is_front_page() || is_paged() ) {
				return;
			}
			self::$front_intro_rendered = true;
			$title = __( 'AI Amigos: practical artificial intelligence guides', 'aiamigos-remediation' );
			$text  = __( 'Explore plain-language articles about AI concepts, tools, learning paths, and responsible use. Check each article’s publication date and cited sources before relying on fast-changing information.', 'aiamigos-remediation' );
			echo '<section class="aiamigos-remediation-intro" aria-labelledby="aiamigos-remediation-intro-title"><h1 id="aiamigos-remediation-intro-title">' . esc_html( $title ) . '</h1><p>' . esc_html( $text ) . '</p></section>';
		}

		/**
		 * Add one visible H1 immediately before the canonical posts loop.
		 *
		 * @param WP_Query $query Loop query.
		 * @return void
		 */
		public static function render_blog_archive_heading( $query ) {
			if ( self::$blog_heading_rendered || ! self::is_frontend_request() || ! is_home() || ! self::is_blog_archive_request() || ! $query->is_main_query() ) {
				return;
			}
			self::$blog_heading_rendered = true;
			echo '<h1 class="aiamigos-remediation-blog-heading">' . esc_html__( 'AI Amigos Blog', 'aiamigos-remediation' ) . '</h1>';
		}

		/**
		 * Detect archive/listing contexts for image policy.
		 *
		 * @return bool
		 */
		private static function is_listing_context() {
			return self::is_frontend_request() && ( is_home() || is_archive() || is_search() || self::is_blog_archive_request() );
		}

		/**
		 * Prevent listing cards from requesting original/full featured images.
		 *
		 * @param string|array $size    Requested size.
		 * @param int          $post_id Post ID.
		 * @return string|array
		 */
		public static function filter_listing_thumbnail_size( $size, $post_id ) {
			if ( self::is_listing_context() ) {
				return apply_filters( 'aiamigos_remediation_listing_thumbnail_size', 'large', $post_id, $size );
			}
			return $size;
		}

	}
}
