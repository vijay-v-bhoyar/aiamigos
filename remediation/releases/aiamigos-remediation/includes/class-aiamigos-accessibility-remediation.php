<?php
/**
 * Deterministic front-end accessibility repairs for the captured Sirat Pro
 * controls. The module is isolated from the main policy class so it can be
 * disabled or rolled back independently when a browser gate finds a mismatch.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'AIAmigos_Accessibility_Remediation', false ) ) {
	final class AIAmigos_Accessibility_Remediation {
		/** @var bool */
		private static $booted = false;

		/**
		 * Register the asset hook exactly once.
		 *
		 * @return void
		 */
		public static function boot() {
			if ( self::$booted ) {
				return;
			}
			self::$booted = true;

			add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ), 1000 );
		}

		/**
		 * Enqueue the paired CSS and JavaScript only on public HTML requests.
		 * Missing assets fail closed so a partial remediation is never emitted.
		 *
		 * @return void
		 */
		public static function enqueue_assets() {
			if ( ! self::is_public_frontend_request() || ! apply_filters( 'aiamigos_accessibility_remediation_enabled', true ) ) {
				return;
			}
			if ( ! defined( 'AIAMIGOS_REMEDIATION_FILE' ) || ! defined( 'AIAMIGOS_REMEDIATION_DIR' ) ) {
				return;
			}

			$style_relative = 'assets/css/aiamigos-accessibility-remediation.css';
			$script_relative = 'assets/js/aiamigos-accessibility-remediation.js';
			$style_path = AIAMIGOS_REMEDIATION_DIR . $style_relative;
			$script_path = AIAMIGOS_REMEDIATION_DIR . $script_relative;
			if ( ! is_readable( $style_path ) || ! is_readable( $script_path ) ) {
				return;
			}

			$version = defined( 'AIAMIGOS_REMEDIATION_VERSION' ) ? AIAMIGOS_REMEDIATION_VERSION . '-a11y2' : '1.0.0-a11y2';
			$handle = 'aiamigos-accessibility-remediation';

			wp_enqueue_style(
				$handle,
				plugins_url( $style_relative, AIAMIGOS_REMEDIATION_FILE ),
				array(),
				$version
			);
			wp_enqueue_script(
				$handle,
				plugins_url( $script_relative, AIAMIGOS_REMEDIATION_FILE ),
				array(),
				$version,
				true
			);
			if ( function_exists( 'wp_script_add_data' ) ) {
				wp_script_add_data( $handle, 'strategy', 'defer' );
			}
		}

		/**
		 * Exclude admin, machine, feed, embed, and non-HTML execution planes.
		 *
		 * @return bool
		 */
		private static function is_public_frontend_request() {
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
			if ( function_exists( 'is_feed' ) && is_feed() ) {
				return false;
			}
			if ( function_exists( 'is_embed' ) && is_embed() ) {
				return false;
			}

			return true;
		}
	}
}
