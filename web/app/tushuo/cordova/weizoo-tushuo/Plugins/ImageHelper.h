#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@interface ImageHelper : CDVPlugin{
    
}

-(void) saveToUserLibrary:(NSMutableArray*) arguments withDict:(NSMutableDictionary*) options;

@end