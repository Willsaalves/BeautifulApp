package com.beautifulapp.media;

public enum MediaKind {
    AVATAR(true), COVER(true), PORTFOLIO(true), STORY(true), DESIGN(true),
    RECEIPT(false), REFERENCE(false);

    private final boolean publicRead;

    MediaKind(boolean publicRead) { this.publicRead = publicRead; }

    public boolean publicRead() { return publicRead; }

    public String prefix() { return name().toLowerCase(); }
}
