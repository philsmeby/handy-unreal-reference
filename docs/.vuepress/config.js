module.exports = {
	// Site Configuration
	title: 'Handy Unreal Engine Reference Guide',
	description: 'A quick reference guide for the Unreal Engine 4.  Short and to the point!',
	base: '/handy-unreal-reference/',
	lang: 'en-US',

	// theme and its config
	theme: '@vuepress/theme-default',
	themeConfig: {
		domain: 'https://philsmeby.github.io/handy-unreal-reference',
		repo: 'philsmeby/handy-unreal-reference',
		repoLabel: 'Follow this Repo',
		editLinks: true,
		editLinkText: 'Edit on GitHub',
		logo: 'https://www.pngkey.com/png/full/275-2752575_ue4-logo-unreal-engine-logo-png.png',
	},

	// Plugins
	plugins: [
		[
      'vuepress-plugin-git-log',
      {
        additionalArgs: '--no-merge',
        onlyFirstAndLastCommit: true,
      },
    ],
	],
}