// Hide Indie Wiki Buddy promo banner
const bwTopBanners = document.querySelectorAll('.bw-top-banner');
bwTopBanners.forEach((banner) => {
	if (banner.innerText.includes('affiliated browser extension')) {
		banner.style.display = 'none';
	}
});