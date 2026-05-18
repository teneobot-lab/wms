import { NextRequest, NextResponse } from 'next/server';

// Backend API URL - ngrok tunnel URL
const API_BASE_URL = 'https://unmystic-prepsychological-bryon.ngrok-free.dev';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const searchParams = request.nextUrl.search;
  const url = `${API_BASE_URL}/api/${path}${searchParams}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy GET error:', error);
    console.error('URL attempted:', url);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const url = `${API_BASE_URL}/api/${path}`;

  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy POST error:', error);
    console.error('URL attempted:', url);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const url = `${API_BASE_URL}/api/${path}`;

  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy PUT error:', error);
    console.error('URL attempted:', url);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const url = `${API_BASE_URL}/api/${path}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy DELETE error:', error);
    console.error('URL attempted:', url);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const url = `${API_BASE_URL}/api/${path}`;

  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy PATCH error:', error);
    console.error('URL attempted:', url);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}