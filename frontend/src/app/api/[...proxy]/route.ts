import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'https://wms-api.teneobot.com';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const searchParams = request.nextUrl.search;

  try {
    const response = await fetch(`${API_BASE_URL}/api/${path}${searchParams}`, {
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
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const body = await request.json();

  try {
    const response = await fetch(`${API_BASE_URL}/api/${path}`, {
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
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const body = await request.json();

  try {
    const response = await fetch(`${API_BASE_URL}/api/${path}`, {
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
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');

  try {
    const response = await fetch(`${API_BASE_URL}/api/${path}`, {
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
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/proxy/', '');
  const body = await request.json().catch(() => ({}));

  try {
    const response = await fetch(`${API_BASE_URL}/api/${path}`, {
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
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}