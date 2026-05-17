const REVIEWS_QUERY = "Lin's Acupuncture Clinic Saskatoon";
const REVIEWS_LIMIT = 5;
const CACHE_HEADER = 's-maxage=86400, stale-while-revalidate=3600';

export async function onRequestGet(context) {
  try {
    const apiKey = context.env.LIN_CLINIC_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      return json({ message: 'Missing Google Maps API key.' }, 500);
    }

    const textSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    textSearchUrl.searchParams.set('query', REVIEWS_QUERY);
    textSearchUrl.searchParams.set('key', apiKey);

    const textSearchResponse = await fetch(textSearchUrl.toString());
    if (!textSearchResponse.ok) {
      return json({ message: 'Google Places Text Search failed.' }, 502);
    }

    const textSearchData = await textSearchResponse.json();
    if (textSearchData.status !== 'OK' || !Array.isArray(textSearchData.results) || !textSearchData.results.length) {
      return json({ message: 'No Google Places results found.' }, 404);
    }

    const placeId = textSearchData.results[0].place_id;
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', placeId);
    detailsUrl.searchParams.set('fields', 'name,rating,user_ratings_total,reviews,url');
    detailsUrl.searchParams.set('reviews_sort', 'newest');
    detailsUrl.searchParams.set('key', apiKey);

    const detailsResponse = await fetch(detailsUrl.toString());
    if (!detailsResponse.ok) {
      return json({ message: 'Google Places Details failed.' }, 502);
    }

    const detailsData = await detailsResponse.json();
    if (detailsData.status !== 'OK' || !detailsData.result) {
      return json({ message: 'No Google Places details available.' }, 404);
    }

    const place = detailsData.result;
    const rawReviews = Array.isArray(place.reviews) ? place.reviews.slice() : [];
    rawReviews.sort((a, b) => (b.time || 0) - (a.time || 0));

    const reviews = rawReviews.slice(0, REVIEWS_LIMIT).map((review) => ({
      author_name: review.author_name || 'Google Review',
      rating: Number(review.rating || 0),
      text: review.text || '',
      time: review.time || 0,
      relative_time_description: review.relative_time_description || ''
    }));

    const body = {
      place: {
        name: place.name || "Lin's Acupuncture Clinic",
        rating: Number(place.rating || 0),
        total: Number(place.user_ratings_total || 0),
        url: place.url || ''
      },
      reviews,
      fetchedAt: new Date().toISOString()
    };

    return json(body, 200, { 'Cache-Control': CACHE_HEADER });
  } catch (error) {
    return json({ message: 'Failed to load Google reviews.' }, 500);
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}
