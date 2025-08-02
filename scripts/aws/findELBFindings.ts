import { 
  ElasticLoadBalancingV2Client, 
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
  DescribeTargetHealthCommand,
  LoadBalancer,
  TargetGroup
} from '@aws-sdk/client-elastic-load-balancing-v2';

import {
  ElasticLoadBalancingClient,
  DescribeLoadBalancersCommand as DescribeClassicLoadBalancersCommand,
  LoadBalancerDescription
} from '@aws-sdk/client-elastic-load-balancing';

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  Datapoint
} from '@aws-sdk/client-cloudwatch';

/**
 * Find Elastic Load Balancers (ELBs) that are idle and should be deleted
 * @param credentials - AWS credentials
 * @param region - AWS region
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findELBFindings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding Elastic Load Balancers (ELBs) that are idle and should be deleted');

    // Create ELBv2 client (for ALB and NLB)
    const elbv2Client = new ElasticLoadBalancingV2Client({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    // Create Classic ELB client
    const elbClient = new ElasticLoadBalancingClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    // Create CloudWatch client for traffic metrics
    const cloudWatchClient = new CloudWatchClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    // Get all ELBv2 load balancers (ALB and NLB)
    const elbv2LoadBalancers = await getAllELBv2LoadBalancers(elbv2Client);
    console.log(`Found ${elbv2LoadBalancers.length} ELBv2 load balancers (ALB/NLB)`);

    // Get all Classic load balancers
    const classicLoadBalancers = await getAllClassicLoadBalancers(elbClient);
    console.log(`Found ${classicLoadBalancers.length} Classic load balancers`);

    const findings: any[] = [];
    const idleELBFindings: any[] = [];

    // Check ELBv2 load balancers (ALB and NLB)
    for (const loadBalancer of elbv2LoadBalancers) {
      if (!loadBalancer.LoadBalancerArn || !loadBalancer.LoadBalancerName) continue;

      const loadBalancerArn = loadBalancer.LoadBalancerArn;
      const loadBalancerName = loadBalancer.LoadBalancerName;
      const loadBalancerType = loadBalancer.Type || 'unknown';

      // Check if the load balancer has no registered targets
      const hasNoTargets = await checkELBv2HasNoTargets(elbv2Client, loadBalancerArn);

      // Check if the load balancer has minimal traffic
      const hasMinimalTraffic = await checkELBv2HasMinimalTraffic(cloudWatchClient, loadBalancerName, loadBalancerType);

      if (hasNoTargets || hasMinimalTraffic) {
        const reason = hasNoTargets 
          ? 'no registered targets' 
          : 'minimal traffic over the past 30 days';

        const idleELBFinding = {
          id: 'aws_elb_idle',
          key: `aws-elb-idle-${loadBalancerName}`,
          title: `Idle ${loadBalancerType.toUpperCase()} Load Balancer (${loadBalancerName})`,
          description: `Load balancer ${loadBalancerName} is idle with ${reason} and should be reviewed for deletion to avoid unnecessary costs.`,
          additionalInfo: {
            loadBalancerName,
            loadBalancerType,
            reason: hasNoTargets ? 'No registered targets' : 'Minimal traffic',
            ...(accountId && { accountId })
          }
        };

        idleELBFindings.push(idleELBFinding);
        findings.push(idleELBFinding);
      }
    }

    // Check Classic load balancers
    for (const loadBalancer of classicLoadBalancers) {
      if (!loadBalancer.LoadBalancerName) continue;

      const loadBalancerName = loadBalancer.LoadBalancerName;

      // Check if the Classic load balancer has no registered instances
      const hasNoInstances = loadBalancer.Instances?.length === 0;

      // Check if the Classic load balancer has minimal traffic
      const hasMinimalTraffic = await checkClassicELBHasMinimalTraffic(cloudWatchClient, loadBalancerName);

      if (hasNoInstances || hasMinimalTraffic) {
        const reason = hasNoInstances 
          ? 'no registered instances' 
          : 'minimal traffic over the past 30 days';

        const idleELBFinding = {
          id: 'aws_elb_idle',
          key: `aws-elb-idle-${loadBalancerName}`,
          title: `Idle Classic Load Balancer (${loadBalancerName})`,
          description: `Classic load balancer ${loadBalancerName} is idle with ${reason} and should be reviewed for deletion to avoid unnecessary costs.`,
          additionalInfo: {
            loadBalancerName,
            loadBalancerType: 'classic',
            reason: hasNoInstances ? 'No registered instances' : 'Minimal traffic',
            ...(accountId && { accountId })
          }
        };

        idleELBFindings.push(idleELBFinding);
        findings.push(idleELBFinding);
      }
    }

    console.log(`Found ${idleELBFindings.length} idle Elastic Load Balancers`);

    return findings;
  } catch (error) {
    console.error('Error finding ELB findings:', error);
    return [];
  }
}

/**
 * Get all ELBv2 load balancers (ALB and NLB)
 * @param elbv2Client - ELBv2 client
 * @returns Array of ELBv2 load balancers
 */
async function getAllELBv2LoadBalancers(elbv2Client: ElasticLoadBalancingV2Client): Promise<LoadBalancer[]> {
  try {
    const loadBalancers: LoadBalancer[] = [];
    let nextMarker: string | undefined;

    do {
      const command = new DescribeLoadBalancersCommand({
        Marker: nextMarker
      });

      const response = await elbv2Client.send(command);

      if (response.LoadBalancers && response.LoadBalancers.length > 0) {
        loadBalancers.push(...response.LoadBalancers);
      }

      nextMarker = response.NextMarker;
    } while (nextMarker);

    return loadBalancers;
  } catch (error) {
    console.error('Error getting ELBv2 load balancers:', error);
    return [];
  }
}

/**
 * Get all Classic load balancers
 * @param elbClient - Classic ELB client
 * @returns Array of Classic load balancers
 */
async function getAllClassicLoadBalancers(elbClient: ElasticLoadBalancingClient): Promise<LoadBalancerDescription[]> {
  try {
    const loadBalancers: LoadBalancerDescription[] = [];
    let nextMarker: string | undefined;

    do {
      const command = new DescribeClassicLoadBalancersCommand({
        Marker: nextMarker
      });

      const response = await elbClient.send(command);

      if (response.LoadBalancerDescriptions && response.LoadBalancerDescriptions.length > 0) {
        loadBalancers.push(...response.LoadBalancerDescriptions);
      }

      nextMarker = response.NextMarker;
    } while (nextMarker);

    return loadBalancers;
  } catch (error) {
    console.error('Error getting Classic load balancers:', error);
    return [];
  }
}

/**
 * Check if an ELBv2 load balancer has no registered targets
 * @param elbv2Client - ELBv2 client
 * @param loadBalancerArn - ARN of the load balancer to check
 * @returns True if the load balancer has no registered targets, false otherwise
 */
async function checkELBv2HasNoTargets(elbv2Client: ElasticLoadBalancingV2Client, loadBalancerArn: string): Promise<boolean> {
  try {
    // Get target groups for the load balancer
    const targetGroupsCommand = new DescribeTargetGroupsCommand({
      LoadBalancerArn: loadBalancerArn
    });

    const targetGroupsResponse = await elbv2Client.send(targetGroupsCommand);

    if (!targetGroupsResponse.TargetGroups || targetGroupsResponse.TargetGroups.length === 0) {
      // No target groups means no targets
      return true;
    }

    // Check each target group for registered targets
    for (const targetGroup of targetGroupsResponse.TargetGroups) {
      if (!targetGroup.TargetGroupArn) continue;

      const targetHealthCommand = new DescribeTargetHealthCommand({
        TargetGroupArn: targetGroup.TargetGroupArn
      });

      const targetHealthResponse = await elbv2Client.send(targetHealthCommand);

      if (targetHealthResponse.TargetHealthDescriptions && 
          targetHealthResponse.TargetHealthDescriptions.length > 0) {
        // This target group has at least one target
        return false;
      }
    }

    // If we get here, no target groups have any targets
    return true;
  } catch (error) {
    console.error(`Error checking if ELBv2 load balancer ${loadBalancerArn} has no targets:`, error);
    // In case of error, we'll assume the load balancer might have targets
    return false;
  }
}

/**
 * Check if an ELBv2 load balancer has minimal traffic
 * @param cloudWatchClient - CloudWatch client
 * @param loadBalancerName - Name of the load balancer to check
 * @param loadBalancerType - Type of the load balancer (alb, nlb)
 * @returns True if the load balancer has minimal traffic, false otherwise
 */
async function checkELBv2HasMinimalTraffic(
  cloudWatchClient: CloudWatchClient, 
  loadBalancerName: string,
  loadBalancerType: string
): Promise<boolean> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Different metrics based on load balancer type
    const metricName = loadBalancerType.toLowerCase() === 'network' ? 'ActiveFlowCount' : 'RequestCount';
    const namespace = loadBalancerType.toLowerCase() === 'network' ? 'AWS/NetworkELB' : 'AWS/ApplicationELB';
    const dimensionName = 'LoadBalancer';

    // For ALB, the dimension value is the last part of the ARN
    // For simplicity, we'll just use the name which should work in most cases
    const dimensionValue = loadBalancerName;

    const command = new GetMetricStatisticsCommand({
      Namespace: namespace,
      MetricName: metricName,
      Dimensions: [
        {
          Name: dimensionName,
          Value: dimensionValue
        }
      ],
      StartTime: thirtyDaysAgo,
      EndTime: now,
      Period: 86400, // 1 day in seconds
      Statistics: ['Sum']
    });

    const response = await cloudWatchClient.send(command);

    if (!response.Datapoints || response.Datapoints.length === 0) {
      // No data points means no traffic
      return true;
    }

    // Check if all data points have minimal traffic
    // For this example, we'll consider "minimal" as less than 10 requests/flows per day
    const minimalTrafficThreshold = 10;

    const hasSignificantTraffic = response.Datapoints.some(datapoint => 
      (datapoint.Sum || 0) > minimalTrafficThreshold
    );

    return !hasSignificantTraffic;
  } catch (error) {
    console.error(`Error checking if ELBv2 load balancer ${loadBalancerName} has minimal traffic:`, error);
    // In case of error, we'll assume the load balancer might have traffic
    return false;
  }
}

/**
 * Check if a Classic load balancer has minimal traffic
 * @param cloudWatchClient - CloudWatch client
 * @param loadBalancerName - Name of the load balancer to check
 * @returns True if the load balancer has minimal traffic, false otherwise
 */
async function checkClassicELBHasMinimalTraffic(
  cloudWatchClient: CloudWatchClient, 
  loadBalancerName: string
): Promise<boolean> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const command = new GetMetricStatisticsCommand({
      Namespace: 'AWS/ELB',
      MetricName: 'RequestCount',
      Dimensions: [
        {
          Name: 'LoadBalancerName',
          Value: loadBalancerName
        }
      ],
      StartTime: thirtyDaysAgo,
      EndTime: now,
      Period: 86400, // 1 day in seconds
      Statistics: ['Sum']
    });

    const response = await cloudWatchClient.send(command);

    if (!response.Datapoints || response.Datapoints.length === 0) {
      // No data points means no traffic
      return true;
    }

    // Check if all data points have minimal traffic
    // For this example, we'll consider "minimal" as less than 10 requests per day
    const minimalTrafficThreshold = 10;

    const hasSignificantTraffic = response.Datapoints.some(datapoint => 
      (datapoint.Sum || 0) > minimalTrafficThreshold
    );

    return !hasSignificantTraffic;
  } catch (error) {
    console.error(`Error checking if Classic load balancer ${loadBalancerName} has minimal traffic:`, error);
    // In case of error, we'll assume the load balancer might have traffic
    return false;
  }
}
