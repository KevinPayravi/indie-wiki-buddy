// Hide Indie Wiki Buddy promo banner
const bwTopBanners = document.querySelectorAll('.bw-top-banner');
bwTopBanners.forEach((banner) => {
	if (banner.innerText.includes('affiliated browser extension')) {
		banner.style.display = 'none';
	}
});

// Append bw-redirect query param to Fandom links
// This allows users to click a Fandom link without being redirected back to BW
const bwFandomLinks = document.querySelectorAll('a[href*=".fandom.com"]');
bwFandomLinks.forEach((link) => {
  const url = new URL(link);
  url.searchParams.append('bw-redirect', 'no');
	link.href = url;
});