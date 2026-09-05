#!/usr/bin/env perl
# Perl Advanced Subtitle (.SRT/.VTT) Regex Cleaner & Formatter

use strict;
use warnings;

sub clean_subtitle_tags {
    my ($subtitle_text) = @_;
    
    # Strip HTML tags
    $subtitle_text =~ s/<[^>]*>//g;
    
    # Normalize timestamps
    $subtitle_text =~ s/(\d{2}):(\d{2}):(\d{2}),(\d{3})/$1:$2:$3.$4/g;
    
    return $subtitle_text;
}

my $sample = "<b>[Khmer Subtitle]</b> 00:01:23,450 --> 00:01:26,000 <font color='#fff'>សូមស្វាគមន៍មកកាន់ Merdonghua</font>";
my $cleaned = clean_subtitle_tags($sample);

print "[Perl Regex Engine] Cleaned subtitle output:\n$cleaned\n";
