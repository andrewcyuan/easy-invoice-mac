#import <AppKit/AppKit.h>
#import <CoreText/CoreText.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

static char *json(id value) {
    NSData *data = [NSJSONSerialization dataWithJSONObject:value options:0 error:nil];
    return strdup([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding].UTF8String);
}
static NSFont *resolve(NSString *name) {
    if ([name hasPrefix:@"__system"]) {
        NSFont *font = [NSFont systemFontOfSize:12 weight:[name containsString:@"bold"] ? NSFontWeightBold : NSFontWeightRegular];
        return [name containsString:@"italic"] ? [[NSFontManager sharedFontManager] convertFont:font toHaveTrait:NSItalicFontMask] : font;
    }
    // Names come from enabled fonts, not caller-provided paths.
    if (![[NSFontManager sharedFontManager].availableFonts containsObject:name]) return nil;
    return [NSFont fontWithName:name size:12];
}
char *invoice_fonts(void) {
    @autoreleasepool {
        NSMutableArray *result = [NSMutableArray array];
        for (NSString *name in [NSFontManager sharedFontManager].availableFonts) {
            NSFont *font = [NSFont fontWithName:name size:12];
            if (!font || [name hasPrefix:@"."]) continue;
            NSDictionary *traits = (__bridge_transfer NSDictionary *)CTFontCopyTraits((__bridge CTFontRef)font);
            double w = [traits[(__bridge NSString *)kCTFontWeightTrait] doubleValue];
            int weight = w < -0.5 ? 100 : w < -0.2 ? 300 : w < 0.15 ? 400 : w < 0.28 ? 500 : w < 0.38 ? 600 : w < 0.5 ? 700 : 900;
            BOOL italic = (CTFontGetSymbolicTraits((__bridge CTFontRef)font) & kCTFontItalicTrait) != 0;
            [result addObject:@{@"id":name,@"family":font.familyName ?: name,@"name":font.displayName ?: name,@"weight":@(weight),@"italic":@(italic)}];
        }
        return json(result);
    }
}
static void put16(uint8_t *p, uint16_t n) { p[0]=n>>8; p[1]=n; }
static void put32(uint8_t *p, uint32_t n) { p[0]=n>>24; p[1]=n>>16; p[2]=n>>8; p[3]=n; }
static uint32_t sum(const uint8_t *p, NSUInteger n) {
    uint32_t total=0;
    for(NSUInteger i=0;i<n;i+=4) { uint32_t word=0; for(int j=0;j<4;j++) word=(word<<8) | (i+j<n ? p[i+j] : 0); total+=word; }
    return total;
}
char *invoice_font_data(const char *identifier) {
    @autoreleasepool {
        NSFont *font=resolve([NSString stringWithUTF8String:identifier]);
        if(!font) return json(@{@"error":@"This font is no longer enabled. Using the bundled fallback."});
        CTFontRef ct=(__bridge CTFontRef)font;
        NSData *os2=(__bridge_transfer NSData *)CTFontCopyTable(ct, kCTFontTableOS2, kCTFontTableOptionNoOptions);
        if(os2.length>=10) {
            const uint8_t *bytes=os2.bytes; uint16_t flags=(bytes[8]<<8)|bytes[9];
            if(flags & (0x2|0x100|0x200)) return json(@{@"error":@"This font does not permit PDF subsetting. Using the bundled fallback."});
        }
        // Rebuild a standalone SFNT from Core Text tables. This also handles faces inside TTC collections.
        CFArrayRef tags=CTFontCopyAvailableTables(ct,kCTFontTableOptionNoOptions);
        NSMutableDictionary *tables=[NSMutableDictionary dictionary];
        for(CFIndex i=0;tags && i<CFArrayGetCount(tags);i++) {
            NSNumber *tag=@((uint32_t)(uintptr_t)CFArrayGetValueAtIndex(tags,i));
            if(tag.unsignedIntValue==0x44534947) continue; // stale digital signature
            NSData *data=(__bridge_transfer NSData *)CTFontCopyTable(ct,tag.unsignedIntValue,kCTFontTableOptionNoOptions);
            if(data.length) tables[tag]=data;
        }
        if(tags) CFRelease(tags);
        if(!tables[@(0x676c7966)] && !tables[@(0x43464620)]) return json(@{@"error":@"This font has no supported outlines. Using the bundled fallback."});
        NSArray *keys=[[tables allKeys] sortedArrayUsingSelector:@selector(compare:)];
        NSUInteger count=keys.count, offset=12+16*count, headOffset=0;
        NSMutableData *sfnt=[NSMutableData dataWithLength:offset];
        uint8_t *header=sfnt.mutableBytes;
        put32(header,tables[@(0x43464620)] ? 0x4f54544f : 0x00010000);put16(header+4,count);
        uint16_t power=1,selector=0;while(power*2<=count){power*=2;selector++;}
        put16(header+6,power*16);put16(header+8,selector);put16(header+10,count*16-power*16);
        for(NSUInteger i=0;i<count;i++) {
            NSNumber *key=keys[i];NSMutableData *data=[tables[key] mutableCopy];
            if(key.unsignedIntValue==0x68656164 && data.length>=12) {put32((uint8_t *)data.mutableBytes+8,0);headOffset=offset;}
            uint32_t checksum=sum(data.bytes,data.length);NSUInteger length=data.length;
            [sfnt appendData:data];[sfnt increaseLengthBy:(4-length%4)%4];
            uint8_t *record=(uint8_t *)sfnt.mutableBytes+12+i*16;
            put32(record,key.unsignedIntValue);put32(record+4,checksum);put32(record+8,offset);put32(record+12,length);
            offset=sfnt.length;
        }
        if(headOffset) put32((uint8_t *)sfnt.mutableBytes+headOffset+8,0xb1b0afba-sum(sfnt.bytes,sfnt.length));
        return json(@{@"data":[sfnt base64EncodedStringWithOptions:0]});
    }
}
void invoice_free(char *value) { free(value); }
