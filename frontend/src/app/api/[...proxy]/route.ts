import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://unmystic-prepsychological-bryon.ngrok-free.dev';

function buildBackendUrl(request: NextRequest): string {
  // [...proxy] catches everything after /api/
  // pathname examples: /api/dashboard/kpis, /api/users
  const path = request.nextUrl.pathname.replace(/^\/api\//, '');
  const searchParams = request.nextUrl.search;
  return `${API_BASE_URL}/api/${path}${searchParams}`;
}

function getForwardHeaders(request: NextRequest) {
  return {
    'Authorization': request.headers.get('Authorization') || '',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
}

export async function GET(request: NextRequest) {
  const url = buildBackendUrl(request);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getForwardHeaders(request),
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy GET error:', error, '| URL:', url);
    return NextResponse.json({ success: false, message: 'Failed to connect to API server' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const url = buildBackendUrl(request);
  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: 'POST',
      headers: getForwardHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy POST error:', error, '| URL:', url);
    return NextResponse.json({ success: false, message: 'Failed to connect to API server' }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  const url = buildBackendUrl(request);
  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: 'PUT',
      headers: getForwardHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy PUT error:', error, '| URL:', url);
    return NextResponse.json({ success: false, message: 'Failed to connect to API server' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const url = buildBackendUrl(request);
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getForwardHeaders(request),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy DELETE error:', error, '| URL:', url);
    return NextResponse.json({ success: false, message: 'Failed to connect to API server' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  const url = buildBackendUrl(request);
  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getForwardHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy PATCH error:', error, '| URL:', url);
    return NextResponse.json({ success: false, message: 'Failed to connect to API server' }, { status: 502 });
  }
}
