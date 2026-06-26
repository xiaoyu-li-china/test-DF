#import "RCTSplashScreen.h"
#import <UIKit/UIKit.h>
#import <React/RCTLog.h>

static NSString *const SplashScreenHiddenEvent = @"SplashScreenHidden";

static BOOL _isVisible = YES;
static UIView *_splashView = nil;

@implementation RCTSplashScreen

RCT_EXPORT_MODULE(SplashScreen);

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[SplashScreenHiddenEvent];
}

+ (void)show
{
    if (_isVisible) return;

    dispatch_async(dispatch_get_main_queue(), ^{
        _isVisible = YES;
        UIViewController *rootViewController = [UIApplication sharedApplication].delegate.window.rootViewController;
        if (!rootViewController) return;

        UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"LaunchScreen" bundle:nil];
        UIViewController *launchVC = [storyboard instantiateInitialViewController];
        if (!launchVC) return;

        _splashView = launchVC.view;
        _splashView.frame = [UIScreen mainScreen].bounds;
        _splashView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [rootViewController.view addSubview:_splashView];
    });
}

+ (void)hide
{
    if (!_isVisible) return;

    dispatch_async(dispatch_get_main_queue(), ^{
        _isVisible = NO;
        if (_splashView) {
            [UIView animateWithDuration:0.3 animations:^{
                _splashView.alpha = 0;
            } completion:^(BOOL finished) {
                [_splashView removeFromSuperview];
                _splashView = nil;
            }];
        }
    });
}

RCT_EXPORT_METHOD(show)
{
    [RCTSplashScreen show];
}

RCT_EXPORT_METHOD(hide)
{
    [RCTSplashScreen hide];
}

RCT_EXPORT_METHOD(hideWithDelay:(double)delayMs)
{
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delayMs * NSEC_PER_MSEC)), dispatch_get_main_queue(), ^{
        [RCTSplashScreen hide];
        if (self) {
            [self sendEventWithName:SplashScreenHiddenEvent body:@{}];
        }
    });
}

RCT_EXPORT_METHOD(isVisible:(RCTResponseSenderBlock)callback)
{
    callback(@[@(_isVisible)]);
}

@end
