<?php
/**
 * Dependency-free regression fixtures for the schema allowlist and Rank Math
 * Twitter author-slot policy.
 *
 * Run: php tests/test-schema-author.php
 *
 * The stubs below model only the WordPress contracts exercised by these public
 * callbacks. The production class itself is loaded and executed unchanged.
 */

define( 'ABSPATH', dirname( __DIR__ ) . '/' );

$GLOBALS['aiamigos_test_filters']       = array();
$GLOBALS['aiamigos_test_singular_type'] = false;

function add_filter( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	$GLOBALS['aiamigos_test_filters'][ $hook ][] = array( $callback, $priority, $accepted_args );
	return true;
}

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	return true;
}

function remove_action( $hook, $callback, $priority = 10 ) {
	return true;
}

function is_admin() {
	return false;
}

function wp_doing_ajax() {
	return false;
}

function wp_doing_cron() {
	return false;
}

function wp_unslash( $value ) {
	return $value;
}

function home_url( $path = '/' ) {
	return 'http://www.aiamigos.org/' . ltrim( (string) $path, '/' );
}

function wp_parse_url( $url, $component = -1 ) {
	return -1 === $component ? parse_url( $url ) : parse_url( $url, $component );
}

function set_url_scheme( $url, $scheme = 'https' ) {
	return preg_replace( '#^[a-z][a-z0-9+.-]*:#i', $scheme . ':', (string) $url );
}

function is_singular( $post_types = '' ) {
	$current = $GLOBALS['aiamigos_test_singular_type'];
	if ( false === $current ) {
		return false;
	}
	if ( '' === $post_types || array() === $post_types ) {
		return true;
	}
	$expected = is_array( $post_types ) ? $post_types : array( $post_types );
	return in_array( $current, $expected, true );
}

require_once dirname( __DIR__ ) . '/includes/class-aiamigos-remediation-policy.php';
require_once dirname( __DIR__ ) . '/includes/class-aiamigos-remediation-plugin.php';

$tests  = 0;
$failed = 0;

function aiamigos_schema_test_same( $expected, $actual, $label ) {
	global $tests, $failed;
	$tests++;
	if ( $expected !== $actual ) {
		$failed++;
		fwrite( STDERR, "FAIL {$label}\n  expected: " . var_export( $expected, true ) . "\n  actual:   " . var_export( $actual, true ) . "\n" );
		return;
	}
	echo "PASS {$label}\n";
}

function aiamigos_schema_test_true( $actual, $label ) {
	aiamigos_schema_test_same( true, (bool) $actual, $label );
}

function aiamigos_schema_contains_key( $value, $needle ) {
	if ( ! is_array( $value ) ) {
		return false;
	}
	if ( array_key_exists( $needle, $value ) ) {
		return true;
	}
	foreach ( $value as $child ) {
		if ( aiamigos_schema_contains_key( $child, $needle ) ) {
			return true;
		}
	}
	return false;
}

function aiamigos_schema_contains_value( $value, $needle ) {
	if ( is_array( $value ) ) {
		foreach ( $value as $child ) {
			if ( aiamigos_schema_contains_value( $child, $needle ) ) {
				return true;
			}
		}
		return false;
	}
	return $needle === $value;
}

function aiamigos_schema_collect_types( $value, &$types ) {
	if ( ! is_array( $value ) ) {
		return;
	}
	if ( isset( $value['@type'] ) ) {
		$node_types = is_array( $value['@type'] ) ? $value['@type'] : array( $value['@type'] );
		foreach ( $node_types as $type ) {
			$types[] = strtolower( (string) $type );
		}
	}
	foreach ( $value as $child ) {
		aiamigos_schema_collect_types( $child, $types );
	}
}

function aiamigos_schema_has_filter_registration( $hook, $method, $priority, $accepted_args ) {
	if ( empty( $GLOBALS['aiamigos_test_filters'][ $hook ] ) ) {
		return false;
	}
	foreach ( $GLOBALS['aiamigos_test_filters'][ $hook ] as $registration ) {
		$callback = $registration[0];
		if (
			is_array( $callback ) &&
			isset( $callback[0], $callback[1] ) &&
			'AIAmigos_Remediation_Plugin' === $callback[0] &&
			$method === $callback[1] &&
			$priority === $registration[1] &&
			$accepted_args === $registration[2]
		) {
			return true;
		}
	}
	return false;
}

$_SERVER['REQUEST_URI'] = '/fixture/';

$organization_id = 'https://www.aiamigos.org/#organization';
$website_id      = 'https://www.aiamigos.org/#website';
$webpage_id      = 'https://www.aiamigos.org/fixture/#webpage';
$person_id       = 'https://www.aiamigos.org/author/unreviewed/';
$article_id      = 'https://www.aiamigos.org/fixture/#article';
$breadcrumb_id   = 'https://www.aiamigos.org/fixture/#breadcrumb';
$nested_logo_id  = 'https://www.aiamigos.org/#nested-logo';
$shared_image_id = 'https://www.aiamigos.org/#shared-image';

$schema = array(
	'organization' => array(
		'@type' => array( 'EducationalOrganization', 'Organization' ),
		'@id'   => $organization_id,
		'name'  => 'Unapproved Organization',
		'logo'  => array(
			'@type' => 'ImageObject',
			'@id'   => $nested_logo_id,
			'url'   => 'http://www.aiamigos.org/nested-logo.png',
		),
		'image' => array(
			'@type' => 'ImageObject',
			'@id'   => $shared_image_id,
			'url'   => 'http://www.aiamigos.org/shared.png',
		),
	),
	'website'      => array(
		'@type'     => 'WebSite',
		'@id'       => $website_id,
		'url'       => 'http://www.aiamigos.org/',
		'publisher' => array( '@id' => $organization_id ),
	),
	'webpage'      => array(
		'@type'              => 'WebPage',
		'@id'                => $webpage_id,
		'url'                => 'http://aiamigos.org/fixture/',
		'isPartOf'           => array( '@id' => $website_id ),
		'primaryImageOfPage' => array( '@id' => $nested_logo_id ),
		'image'              => array( '@id' => $shared_image_id ),
		'breadcrumb'         => array( '@id' => $breadcrumb_id ),
		'mainEntity'         => array( '@id' => $article_id ),
		'author'             => array( 'name' => 'Untyped Author' ),
		'creator'            => array( 'name' => 'Untyped Creator' ),
		'editor'             => array( 'name' => 'Untyped Editor' ),
		'translator'         => array( 'name' => 'Untyped Translator' ),
		'maintainer'         => array( 'name' => 'Untyped Maintainer' ),
		'sdPublisher'        => array( 'name' => 'Untyped Structured Data Publisher' ),
		'sourceOrganization' => array( 'name' => 'Untyped Source Organization' ),
		'publisherImprint'   => array( 'name' => 'Untyped Publisher Imprint' ),
		'owner'              => array( 'name' => 'Untyped Owner' ),
		'reviewedBy'         => array( '@id' => $person_id ),
	),
	'person'       => array(
		'@type' => 'Person',
		'@id'   => $person_id,
		'name'  => 'Unreviewed Person',
	),
	'article'      => array(
		'@type'  => 'BlogPosting',
		'@id'    => $article_id,
		'author' => array( '@id' => $person_id ),
	),
	'shared_image' => array(
		'@type'      => 'ImageObject',
		'@id'        => $shared_image_id,
		'url'        => 'http://www.aiamigos.org/shared.png',
		'contentUrl' => 'http://cdn.example/shared.png',
	),
	'breadcrumb'   => array(
		'@type'           => 'BreadcrumbList',
		'@id'             => $breadcrumb_id,
		'itemListElement' => array(
			array(
				'@type'    => 'ListItem',
				'position' => 1,
				'item'     => array( '@id' => 'https://www.aiamigos.org/', 'name' => 'Home' ),
			),
			array(
				'@type' => 'Person',
				'@id'   => 'https://www.aiamigos.org/author/nested-unreviewed/',
				'name'  => 'Nested Unreviewed Person',
			),
			array(
				'@type'    => 'ListItem',
				'position' => 2,
				'item'     => array( '@id' => $webpage_id, 'name' => 'Fixture' ),
			),
		),
	),
	'mixed_page'   => array(
		'@type' => array( 'WebPage', 'ProfilePage' ),
		'@id'   => 'https://www.aiamigos.org/mixed/#webpage',
	),
);

$filtered = AIAmigos_Remediation_Plugin::filter_unverified_schema( $schema );

aiamigos_schema_test_same(
	array( 'website', 'webpage', 'shared_image', 'breadcrumb' ),
	array_keys( $filtered ),
	'unapproved top-level entity types and mixed-type nodes are removed'
);

$types = array();
aiamigos_schema_collect_types( $filtered, $types );
$unapproved_types = array_diff( array_unique( $types ), array( 'website', 'webpage', 'breadcrumblist', 'listitem', 'imageobject' ) );
aiamigos_schema_test_same( array(), array_values( $unapproved_types ), 'only approved structural schema types survive' );

foreach (
	array(
		'author', 'creator', 'editor', 'translator', 'maintainer', 'sdPublisher',
		'sourceOrganization', 'publisherImprint', 'owner', 'publisher',
		'reviewedBy', 'mainEntity',
	) as $relationship
) {
	aiamigos_schema_test_same( false, aiamigos_schema_contains_key( $filtered, $relationship ), "identity relationship {$relationship} is removed" );
}

foreach ( array( $organization_id, $person_id, $article_id, $nested_logo_id ) as $removed_id ) {
	aiamigos_schema_test_same( false, aiamigos_schema_contains_value( $filtered, $removed_id ), "removed definition {$removed_id} has no dangling reference" );
}

aiamigos_schema_test_true( aiamigos_schema_contains_value( $filtered, $shared_image_id ), 'shared image ID survives because an approved top-level definition remains' );
aiamigos_schema_test_same( array( '@id' => $shared_image_id ), $filtered['webpage']['image'], 'reference to surviving shared image is retained' );
aiamigos_schema_test_same( array( '@id' => $website_id ), $filtered['webpage']['isPartOf'], 'structural WebPage to WebSite relationship is retained' );
aiamigos_schema_test_same( array( '@id' => $breadcrumb_id ), $filtered['webpage']['breadcrumb'], 'structural breadcrumb relationship is retained' );
aiamigos_schema_test_same( array( 0, 1 ), array_keys( $filtered['breadcrumb']['itemListElement'] ), 'schema lists are reindexed after rejected nodes are removed' );
aiamigos_schema_test_same( 2, count( $filtered['breadcrumb']['itemListElement'] ), 'allowed breadcrumb items remain around a rejected nested entity' );
aiamigos_schema_test_same( 'https://www.aiamigos.org/', $filtered['website']['url'], 'same-site HTTP schema URL is upgraded to HTTPS' );
aiamigos_schema_test_same( 'https://www.aiamigos.org/shared.png', $filtered['shared_image']['url'], 'same-site image URL is upgraded to HTTPS' );
aiamigos_schema_test_same( 'http://cdn.example/shared.png', $filtered['shared_image']['contentUrl'], 'external HTTP schema URL is not rewritten' );

$GLOBALS['aiamigos_test_singular_type'] = 'post';
aiamigos_schema_test_same( false, AIAmigos_Remediation_Plugin::filter_unattested_twitter_author_label( 'Written by' ), 'standard post suppresses author slot label' );
aiamigos_schema_test_same( false, AIAmigos_Remediation_Plugin::filter_unattested_twitter_author_value( 'Named Person' ), 'standard post suppresses generic or named author slot value' );

$GLOBALS['aiamigos_test_singular_type'] = 'page';
aiamigos_schema_test_same( 'Time to read', AIAmigos_Remediation_Plugin::filter_unattested_twitter_author_label( 'Time to read' ), 'page preserves reading-time slot label' );
aiamigos_schema_test_same( '2 minutes', AIAmigos_Remediation_Plugin::filter_unattested_twitter_author_value( '2 minutes' ), 'page preserves reading-time slot value' );

$GLOBALS['aiamigos_test_singular_type'] = false;
aiamigos_schema_test_same( 'Posts', AIAmigos_Remediation_Plugin::filter_unattested_twitter_author_label( 'Posts' ), 'archive preserves post-count slot label' );
aiamigos_schema_test_same( '61', AIAmigos_Remediation_Plugin::filter_unattested_twitter_author_value( '61' ), 'archive preserves post-count slot value' );

AIAmigos_Remediation_Plugin::boot();
aiamigos_schema_test_true(
	aiamigos_schema_has_filter_registration( 'rank_math/opengraph/twitter/twitter_label1', 'filter_unattested_twitter_author_label', 99, 1 ),
	'exact Rank Math twitter:label1 property hook is registered'
);
aiamigos_schema_test_true(
	aiamigos_schema_has_filter_registration( 'rank_math/opengraph/twitter/twitter_data1', 'filter_unattested_twitter_author_value', 99, 1 ),
	'exact Rank Math twitter:data1 property hook is registered'
);
aiamigos_schema_test_true(
	aiamigos_schema_has_filter_registration( 'rank_math/json_ld', 'filter_unverified_schema', 99, 2 ),
	'Rank Math JSON-LD filter receives the documented two arguments'
);

echo "\n{$tests} assertion(s), {$failed} failure(s).\n";
exit( $failed ? 1 : 0 );
