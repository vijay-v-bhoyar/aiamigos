<?php
/**
 * Pure policy helpers. This file intentionally has no WordPress dependency so
 * the highest-risk URL and markup transformations can be tested from the CLI.
 */

if ( ! class_exists( 'AIAmigos_Remediation_Policy', false ) ) {
	final class AIAmigos_Remediation_Policy {
		/**
		 * Merge positive integer IDs without discarding a caller's exclusions.
		 *
		 * WordPress documents post__not_in as an array, but defensive handling of a
		 * scalar or comma-delimited value prevents an existing exclusion from being
		 * lost when a third-party query supplies a non-standard value.
		 *
		 * @param mixed $existing Existing ID or IDs.
		 * @param array $additional IDs to append.
		 * @return array
		 */
		public static function merge_positive_ids( $existing, array $additional ) {
			$values = is_array( $existing ) ? $existing : array( $existing );
			$values = array_merge( $values, $additional );
			$merged = array();

			foreach ( $values as $value ) {
				$candidates = is_string( $value ) ? preg_split( '/[\s,]+/', trim( $value ), -1, PREG_SPLIT_NO_EMPTY ) : array( $value );
				foreach ( $candidates as $candidate ) {
					if ( ! is_int( $candidate ) && ! is_string( $candidate ) && ! is_float( $candidate ) ) {
						continue;
					}
					$id = (int) $candidate;
					if ( 0 < $id && ! in_array( $id, $merged, true ) ) {
						$merged[] = $id;
					}
				}
			}

			return $merged;
		}

		/**
		 * Normalize a request URI or path for exact policy comparisons.
		 *
		 * @param string $request_uri Request URI or path.
		 * @return string
		 */
		public static function normalize_path( $request_uri ) {
			$request_uri = (string) $request_uri;
			if ( preg_match( '#^[a-z][a-z0-9+.-]*://#i', $request_uri ) ) {
				$path = parse_url( $request_uri, PHP_URL_PATH );
			} else {
				$path = preg_split( '/[?#]/', $request_uri, 2 );
				$path = is_array( $path ) ? $path[0] : $request_uri;
			}
			if ( ! is_string( $path ) || '' === $path ) {
				return '/';
			}

			$path = str_replace( "\0", '', rawurldecode( $path ) );
			$path = str_replace( '\\', '/', $path );
			$path = preg_replace( '#/+#', '/', $path );
			$path = '/' . ltrim( (string) $path, '/' );
			if ( '/' !== $path ) {
				$path = rtrim( $path, '/' ) . '/';
			}

			return $path;
		}

		/**
		 * Resolve an old front-end path to its canonical path.
		 *
		 * @param string $request_path   Incoming path.
		 * @param array  $exact_redirect Exact old => new path map.
		 * @param string $blog_base      Canonical blog base.
		 * @return string|null
		 */
		public static function redirect_target_path( $request_path, array $exact_redirect, $blog_base = '/blog/' ) {
			$path = self::normalize_path( $request_path );
			foreach ( $exact_redirect as $source => $target ) {
				if ( strtolower( $path ) === strtolower( self::normalize_path( $source ) ) ) {
					$target_path = self::normalize_path( $target );
					return $target_path === $path ? null : $target_path;
				}
			}

			if ( preg_match( '#^/page/([2-9]|[1-9][0-9]+)/$#i', $path, $matches ) ) {
				$target_path = self::normalize_path( $blog_base . 'page/' . $matches[1] . '/' );
				return $target_path === $path ? null : $target_path;
			}

			return null;
		}

		/**
		 * Test exact path membership after normalization.
		 *
		 * @param string $request_path Path to inspect.
		 * @param array  $paths        Exact paths.
		 * @return bool
		 */
		public static function path_is_listed( $request_path, array $paths ) {
			$needle = strtolower( self::normalize_path( $request_path ) );
			foreach ( $paths as $path ) {
				if ( $needle === strtolower( self::normalize_path( $path ) ) ) {
					return true;
				}
			}
			return false;
		}

		/**
		 * Normalize only same-site menu URLs to the canonical HTTPS/www origin.
		 * External URLs, non-HTTP schemes, query strings, and fragments survive.
		 *
		 * @param string $href           Menu href.
		 * @param string $canonical_base Canonical site origin.
		 * @param array  $exact_redirect Old => new path map.
		 * @param string $blog_base      Canonical blog base.
		 * @return string
		 */
		public static function normalize_menu_url( $href, $canonical_base, array $exact_redirect, $blog_base = '/blog/' ) {
			$href = trim( (string) $href );
			if ( '' === $href || 0 === strpos( $href, '#' ) ) {
				return $href;
			}

			$base = parse_url( (string) $canonical_base );
			if ( ! is_array( $base ) || empty( $base['host'] ) ) {
				return $href;
			}
			$base_scheme = isset( $base['scheme'] ) ? strtolower( (string) $base['scheme'] ) : 'https';
			if ( ! in_array( $base_scheme, array( 'http', 'https' ), true ) ) {
				return $href;
			}

			if ( 0 === strpos( $href, '//' ) ) {
				$href = $base_scheme . ':' . $href;
			}

			$parts = parse_url( $href );
			if ( false === $parts ) {
				return $href;
			}

			if ( isset( $parts['scheme'] ) && ! in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true ) ) {
				return $href;
			}

			$base_host = strtolower( preg_replace( '/^www\./i', '', $base['host'] ) );
			$href_host = isset( $parts['host'] ) ? strtolower( preg_replace( '/^www\./i', '', $parts['host'] ) ) : $base_host;
			if ( $href_host !== $base_host ) {
				return $href;
			}
			if ( isset( $parts['port'] ) && ( ! isset( $base['port'] ) || (int) $parts['port'] !== (int) $base['port'] ) ) {
				return $href;
			}

			$base_path = isset( $base['path'] ) ? self::normalize_path( $base['path'] ) : '/';
			$path      = isset( $parts['path'] ) ? self::normalize_path( $parts['path'] ) : '/';
			if ( '/' !== $base_path ) {
				$base_prefix = rtrim( $base_path, '/' );
				if ( $path === $base_path ) {
					$path = '/';
				} elseif ( 0 === strpos( $path, $base_prefix . '/' ) ) {
					$path = self::normalize_path( substr( $path, strlen( $base_prefix ) ) );
				}
			}
			$path = preg_replace( '#^/index\.php(?:/|$)#i', '/', $path );
			$path = self::normalize_path( $path );
			$redirected_path = self::redirect_target_path( $path, $exact_redirect, $blog_base );
			if ( null !== $redirected_path ) {
				$path = $redirected_path;
			}

			$output_path = '/' === $base_path ? $path : rtrim( $base_path, '/' ) . $path;
			$host        = false !== strpos( $base['host'], ':' ) ? '[' . trim( $base['host'], '[]' ) . ']' : $base['host'];
			$url         = $base_scheme . '://' . $host;
			if ( isset( $base['port'] ) ) {
				$url .= ':' . (int) $base['port'];
			}
			$url .= $output_path;
			if ( isset( $parts['query'] ) && '' !== $parts['query'] ) {
				$url .= '?' . str_replace( array( "\r", "\n" ), '', $parts['query'] );
			}
			if ( isset( $parts['fragment'] ) && '' !== $parts['fragment'] ) {
				$url .= '#' . str_replace( array( "\r", "\n" ), '', $parts['fragment'] );
			}

			return $url;
		}

		/**
		 * Remove loading-strategy attributes from one script tag.
		 *
		 * @param string $tag Script tag.
		 * @return string
		 */
		public static function strip_script_loading_strategy( $tag ) {
			return (string) preg_replace(
				'/\s+(?:async|defer)(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?/i',
				'',
				(string) $tag
			);
		}

		/**
		 * Replace only selected MailPoet form IDs, even when quote characters are malformed.
		 *
		 * @param string $content     Filtered content.
		 * @param string $replacement Safe replacement markup.
		 * @param array  $form_ids    Numeric MailPoet form IDs to replace.
		 * @return string
		 */
		public static function replace_mailpoet_forms( $content, $replacement, array $form_ids ) {
			return (string) preg_replace_callback(
				'/\[mailpoet_form\b[^\]]*\]/iu',
				static function ( $matches ) use ( $replacement, $form_ids ) {
					$token   = $matches[0];
					$decoded = html_entity_decode( $token, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
					if ( ! preg_match( '/\bid\s*=\s*[^0-9\]]*([0-9]+)/iu', $decoded, $id_match ) ) {
						return $token;
					}
					return in_array( (int) $id_match[1], array_map( 'intval', $form_ids ), true ) ? $replacement : $token;
				},
				(string) $content
			);
		}

		/**
		 * Conservative email-shape check usable with or without WordPress.
		 *
		 * @param mixed $value Candidate value.
		 * @return bool
		 */
		public static function is_email_like( $value ) {
			$value = trim( (string) $value );
			return '' !== $value && false !== filter_var( $value, FILTER_VALIDATE_EMAIL );
		}
	}
}
