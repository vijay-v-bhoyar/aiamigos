<?php
/**
 * Dependency-free unit-ish tests for pure remediation policy helpers.
 * Run: php tests/test-policy.php
 */

require_once dirname( __DIR__ ) . '/includes/class-aiamigos-remediation-policy.php';

$tests  = 0;
$failed = 0;

function aiamigos_test_same( $expected, $actual, $label ) {
	global $tests, $failed;
	$tests++;
	if ( $expected !== $actual ) {
		$failed++;
		fwrite( STDERR, "FAIL {$label}\n  expected: " . var_export( $expected, true ) . "\n  actual:   " . var_export( $actual, true ) . "\n" );
		return;
	}
	echo "PASS {$label}\n";
}

$redirects = array(
	'/home/' => '/',
);

aiamigos_test_same( '/', AIAmigos_Remediation_Policy::normalize_path( '' ), 'empty path normalizes to root' );
aiamigos_test_same( '/home/', AIAmigos_Remediation_Policy::normalize_path( '/home?utm=x' ), 'query is excluded from route comparison' );
aiamigos_test_same( '/page/2/', AIAmigos_Remediation_Policy::normalize_path( '//page//2' ), 'duplicate slashes normalize' );
aiamigos_test_same( '/', AIAmigos_Remediation_Policy::redirect_target_path( '/home/', $redirects ), 'legacy home redirects to root' );
aiamigos_test_same( null, AIAmigos_Remediation_Policy::redirect_target_path( '/newsletter-2', $redirects ), 'retired newsletter route is not redirected' );
aiamigos_test_same( true, AIAmigos_Remediation_Policy::path_is_listed( '/newsletter-2', array( '/newsletter/', '/newsletter-2/' ) ), 'retired newsletter route is recognized by an exact tombstone list' );
aiamigos_test_same( '/blog/page/8/', AIAmigos_Remediation_Policy::redirect_target_path( '/page/8/', $redirects ), 'legacy pager redirects to blog pager' );
aiamigos_test_same( '/blog/page/10/', AIAmigos_Remediation_Policy::redirect_target_path( '/page/10/', $redirects ), 'two-digit legacy pager redirects to blog pager' );
aiamigos_test_same( '/blog/page/19/', AIAmigos_Remediation_Policy::redirect_target_path( '/page/19/', $redirects ), 'teen legacy pager redirects to blog pager' );
aiamigos_test_same( '/blog/page/100/', AIAmigos_Remediation_Policy::redirect_target_path( '/page/100/', $redirects ), 'three-digit legacy pager redirects to blog pager' );
aiamigos_test_same( null, AIAmigos_Remediation_Policy::redirect_target_path( '/page/0/', $redirects ), 'page zero is not treated as a paginated archive' );
aiamigos_test_same( null, AIAmigos_Remediation_Policy::redirect_target_path( '/page/1/', $redirects ), 'page one is not treated as a paginated archive' );
aiamigos_test_same( null, AIAmigos_Remediation_Policy::redirect_target_path( '/home/', array( '/home/' => '/home/' ) ), 'self redirect is suppressed' );
aiamigos_test_same( true, AIAmigos_Remediation_Policy::path_is_listed( '/team/member-name-02', array( '/team/member-name-02/' ) ), 'exact path list normalizes slash' );
aiamigos_test_same( false, AIAmigos_Remediation_Policy::path_is_listed( '/team/member-name-01/', array( '/team/member-name-02/' ) ), 'exact path list does not overmatch' );

aiamigos_test_same(
	array( 38, 7, 34, 36, 46, 48, 50, 40, 42, 44 ),
	AIAmigos_Remediation_Policy::merge_positive_ids( array( 38, '7', 34, 0, -1 ), array( 34, 36, 46, 48, 50, 40, 42, 44 ) ),
	'quarantine merges without losing or duplicating existing exclusions'
);
aiamigos_test_same(
	array( 12, 13, 34 ),
	AIAmigos_Remediation_Policy::merge_positive_ids( '12, 13', array( 34 ) ),
	'quarantine defensively preserves comma-delimited exclusions'
);
aiamigos_test_same(
	false,
	in_array( 38, AIAmigos_Remediation_Policy::merge_positive_ids( array(), array( 34, 36, 46, 48, 50, 40, 42, 44 ) ), true ),
	'genuine team record 38 is not added to quarantine'
);

aiamigos_test_same(
	'https://www.aiamigos.org/blog/',
	AIAmigos_Remediation_Policy::normalize_menu_url( 'http://aiamigos.org/index.php/blog/', 'https://www.aiamigos.org/', $redirects ),
	'apex HTTP index.php menu link reaches final canonical URL'
);
aiamigos_test_same(
	'https://www.aiamigos.org/?utm_source=test#top',
	AIAmigos_Remediation_Policy::normalize_menu_url( 'http://aiamigos.org/home/?utm_source=test#top', 'https://www.aiamigos.org/', $redirects ),
	'canonical menu normalization preserves query and fragment'
);
aiamigos_test_same(
	'https://external.example/path',
	AIAmigos_Remediation_Policy::normalize_menu_url( 'https://external.example/path', 'https://www.aiamigos.org/', $redirects ),
	'external HTTPS link is untouched'
);
aiamigos_test_same(
	'mailto:contact@aiamigos.org',
	AIAmigos_Remediation_Policy::normalize_menu_url( 'mailto:contact@aiamigos.org', 'https://www.aiamigos.org/', $redirects ),
	'non-HTTP link is untouched'
);
aiamigos_test_same(
	'http://localhost:8080/staging/blog/',
	AIAmigos_Remediation_Policy::normalize_menu_url( 'http://localhost:8080/staging/index.php/blog/', 'http://localhost:8080/staging/', $redirects ),
	'canonical base scheme, port, and subdirectory are preserved'
);

$script = '<script src="hooks.js" async="async" defer></script>';
aiamigos_test_same( '<script src="hooks.js"></script>', AIAmigos_Remediation_Policy::strip_script_loading_strategy( $script ), 'async and defer attributes are removed' );

$replacement = '<section>Request updates</section>';
aiamigos_test_same(
	$replacement,
	AIAmigos_Remediation_Policy::replace_mailpoet_forms( '[mailpoet_form id=&#8221;3&#8243;]', $replacement, array( 2, 3 ) ),
	'entity-quoted malformed MailPoet form is replaced'
);
aiamigos_test_same(
	$replacement,
	AIAmigos_Remediation_Policy::replace_mailpoet_forms( '[mailpoet_form id=”2″]', $replacement, array( 2, 3 ) ),
	'curly-quoted malformed MailPoet form is replaced'
);
aiamigos_test_same(
	'[mailpoet_form id="99"]',
	AIAmigos_Remediation_Policy::replace_mailpoet_forms( '[mailpoet_form id="99"]', $replacement, array( 2, 3 ) ),
	'unlisted MailPoet form is preserved'
);

aiamigos_test_same( true, AIAmigos_Remediation_Policy::is_email_like( 'contact@aiamigos.org' ), 'email-like call field is detected' );
aiamigos_test_same( false, AIAmigos_Remediation_Policy::is_email_like( '+1 (555) 123-4567' ), 'genuine phone value is preserved' );

echo "\n{$tests} assertion(s), {$failed} failure(s).\n";
exit( $failed ? 1 : 0 );
