#import <Cordova/NSData+Base64.h>
#import "ImageHelper.h"

@implementation ImageHelper

-(void) saveToUserLibrary:(NSMutableArray *)arguments withDict:(NSMutableDictionary *)options
{   
    NSString * base64Data = [arguments objectAtIndex:0];
    NSData *data = [NSData dataFromBase64String:base64Data];
    
    UIImage *img = nil;

    if([data length] != 0){
        img = [[[UIImage alloc] initWithData:data] autorelease];
    }
    if(img != nil){
        UIImageWriteToSavedPhotosAlbum(img, self, nil, nil);
        //保存完调用callback
        NSString* jsCallback = [NSString stringWithFormat:@"W('#message-box').signal('loaded');msgbox('保存成功','success');" ];
        [[super webView] stringByEvaluatingJavaScriptFromString:jsCallback];
    }else{
        NSString* jsCallback = [NSString stringWithFormat:@"W('#message-box').signal('loaded');msgbox('保存失败','error');" ];
        [[super webView] stringByEvaluatingJavaScriptFromString:jsCallback];
    }
}

@end