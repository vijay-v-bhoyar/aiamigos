<?php
/**
 * Plugin Name: AI Amigos Remediation
 * Description: Reversible front-end routing, indexation, theme-compatibility, and presentation safeguards for AIAmigos.org.
 * Version: 1.4.0
 * Requires at least: 6.4
 * Requires PHP: 7.4
 * Author: AI Amigos
 * License: GPL-2.0-or-later
 * Text Domain: aiamigos-remediation
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'AIAMIGOS_REMEDIATION_VERSION', '1.4.0' );
define( 'AIAMIGOS_REMEDIATION_FILE', __FILE__ );
define( 'AIAMIGOS_REMEDIATION_DIR', plugin_dir_path( __FILE__ ) );

require_once AIAMIGOS_REMEDIATION_DIR . 'includes/class-aiamigos-remediation-policy.php';
require_once AIAMIGOS_REMEDIATION_DIR . 'includes/class-aiamigos-remediation-plugin.php';
require_once AIAMIGOS_REMEDIATION_DIR . 'includes/class-aiamigos-accessibility-remediation.php';

AIAmigos_Remediation_Plugin::boot();
AIAmigos_Accessibility_Remediation::boot();
register_activation_hook( __FILE__, array( 'AIAmigos_Remediation_Plugin', 'activate' ) );
